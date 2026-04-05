// =====================================================================
// src/presence/presence.service.ts
// =====================================================================
import { Injectable, OnModuleInit, Inject, Logger } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis from 'ioredis';
import { REDIS_PUBSUB, SUBSCRIPTION_EVENTS } from '../redis/redis.pubsub';
import { getRedisOptions } from '../config/configuration';
 
const PREFIX = 'campushub:presence:';
const TTL    = 300; // 5 minutes
 
@Injectable()
export class PresenceService implements OnModuleInit {
  private readonly logger = new Logger(PresenceService.name);
  private redis!: Redis;
 
  constructor(
    @Inject(REDIS_PUBSUB) private readonly pubSub: RedisPubSub,
  ) {}

  onModuleInit() {
    const opts = getRedisOptions();
    this.redis = new Redis({ ...opts, retryStrategy: (t) => Math.min(t * 100, 3000) });
    this.redis.on('error', (err) => this.logger.error('Presence Redis error', err));
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