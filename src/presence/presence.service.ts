// =====================================================================
// src/presence/presence.service.ts
// =====================================================================
import { Injectable, OnModuleInit, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis from 'ioredis';
import { REDIS_PUBSUB, SUBSCRIPTION_EVENTS } from '../redis/redis.pubsub';
 
const PREFIX = 'campushub:presence:';
const TTL    = 300; // 5 minutes
 
@Injectable()
export class PresenceService implements OnModuleInit {
  private readonly logger = new Logger(PresenceService.name);
  private redis: Redis;
 
  constructor(
    private readonly config: ConfigService,
    @Inject(REDIS_PUBSUB) private readonly pubSub: RedisPubSub,
  ) {}
 
  onModuleInit() {
    this.redis = new Redis({
      host: this.config.get<string>('redis.host'),
      port: this.config.get<number>('redis.port'),
      retryStrategy: (t) => Math.min(t * 100, 3000),
    });
    this.logger.log('Presence service ready');
  }
 
  async setOnline(userId: string): Promise<void> {
    await this.redis.set(`${PREFIX}${userId}`, '1', 'EX', TTL);
    await this.pubSub.publish(SUBSCRIPTION_EVENTS.PRESENCE_UPDATED, {
      [SUBSCRIPTION_EVENTS.PRESENCE_UPDATED]: {
        userId,
        status: 'online',
      },
    });
  }
 
  async setOffline(userId: string): Promise<void> {
    await this.redis.del(`${PREFIX}${userId}`);
    await this.pubSub.publish(SUBSCRIPTION_EVENTS.PRESENCE_UPDATED, {
      [SUBSCRIPTION_EVENTS.PRESENCE_UPDATED]: {
        userId,
        status:     'offline',
        lastSeenAt: new Date(),
      },
    });
  }
 
  async isOnline(userId: string): Promise<boolean> {
    return !!(await this.redis.exists(`${PREFIX}${userId}`));
  }
 
  async getOnlineUserIds(): Promise<string[]> {
    const keys = await this.redis.keys(`${PREFIX}*`);
    return keys.map((k) => k.replace(PREFIX, ''));
  }
 
  async heartbeat(userId: string): Promise<void> {
    await this.redis.expire(`${PREFIX}${userId}`, TTL);
  }
}