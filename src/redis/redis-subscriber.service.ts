 
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
    const host = this.config.get<string>('redis.host');
    const port = this.config.get<number>('redis.port');
    
    this.logger.log(`Connecting to Redis at ${host}:${port}`); 

    this.subscriber = new Redis({ host, port,  retryStrategy: (t) => Math.min(t * 100, 3000), });

    // this.subscriber = new Redis({
    //   host: this.config.get<string>('redis.host'),
    //   port: this.config.get<number>('redis.port'),
    //   retryStrategy: (t) => Math.min(t * 100, 3000),
    // });
 
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