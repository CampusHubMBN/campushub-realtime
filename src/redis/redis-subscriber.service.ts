 
// =====================================================================
// src/redis/redis-subscriber.service.ts
// =====================================================================
// Écoute les events publiés par Laravel et les convertit
// en events NestJS internes via EventEmitter2
// =====================================================================
import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Redis from 'ioredis';
 
export const LARAVEL_CHANNELS = {
  NOTIFICATIONS: 'campushub:notifications',
} as const;
 
@Injectable()
export class RedisSubscriberService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisSubscriberService.name);
  private subscriber: Redis;
 
  constructor(
    private readonly config:  ConfigService,
    private readonly emitter: EventEmitter2,
  ) {}
 
  async onModuleInit() {
    this.subscriber = new Redis({
      host: this.config.get<string>('redis.host'),
      port: this.config.get<number>('redis.port'),
      retryStrategy: (t) => Math.min(t * 100, 3000),
    });
 
    this.subscriber.on('error', (err) =>
      this.logger.error('Redis subscriber error', err),
    );
 
    await this.subscriber.subscribe(...Object.values(LARAVEL_CHANNELS));
 
    this.subscriber.on('message', (channel: string, raw: string) => {
      try {
        const { type, payload } = JSON.parse(raw);
        this.logger.debug(`[Redis] ${channel} → ${type}`);
        // Émettre un event interne NestJS : "redis.campushub:notifications.comment.created"
        this.emitter.emit(`redis.${channel}.${type}`, payload);
      } catch {
        this.logger.warn(`Invalid Redis message on ${channel}: ${raw}`);
      }
    });
 
    this.logger.log('Redis subscriber ready');
  }
 
  async onModuleDestroy() {
    await this.subscriber.quit();
  }
}