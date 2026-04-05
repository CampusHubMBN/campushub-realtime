 
// =====================================================================
// src/redis/redis-subscriber.service.ts
// =====================================================================
// Écoute les events publiés par Laravel et les convertit
// en events NestJS internes via EventEmitter2
// =====================================================================
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Redis from 'ioredis';
import { getRedisOptions } from '../config/configuration';
 
export const LARAVEL_CHANNELS = {
  NOTIFICATIONS: 'campushub:notifications',
} as const;
 
@Injectable()
export class RedisSubscriberService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisSubscriberService.name);
  private subscriber!: Redis;
 
  constructor(
    private readonly emitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    const opts = getRedisOptions();
    this.logger.log(`Connecting to Redis at ${opts.host}:${opts.port} password=${opts.password ? 'SET' : 'NOT SET'}`);
    this.subscriber = new Redis({ ...opts, retryStrategy: (t) => Math.min(t * 100, 3000) });
 
    this.subscriber.on('error', (err) =>
      this.logger.error('Redis subscriber error', err),
    );
 
    await this.subscriber.subscribe(...Object.values(LARAVEL_CHANNELS));
 
    this.subscriber.on('message', (channel: string, raw: string) => {
      // this.logger.error(`RAW MESSAGE RECEIVED: ${channel} → ${raw}`);
      try {
        const { type, payload } = JSON.parse(raw);
        this.logger.debug(`[Redis] ${channel} → ${type}`);
        //  switch (type) {
        //   case 'application.created':
        //   case 'application.status_updated':
        //   case 'message.created':
        //   case 'event.published':
        //     // → Sauvegarder en MongoDB + publier la GraphQL subscription
        //     this.emitter.emit(`redis.${channel}.${type}`, payload);
        //     break;

        //   default:
        //     this.logger.warn(`Unknown event type: ${type}`);
        // }
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