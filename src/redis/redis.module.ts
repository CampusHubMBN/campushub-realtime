// =====================================================================
// src/redis/redis.module.ts
// =====================================================================
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis from 'ioredis';
import { REDIS_PUBSUB, REDIS_PUBLISHER, createRedisPubSub } from './redis.pubsub';
import { RedisSubscriberService } from './redis-subscriber.service';
 
@Global()
@Module({
  providers: [
    // PubSub pour les subscriptions GraphQL
    {
      provide:  REDIS_PUBSUB,
      inject:   [ConfigService],
      useFactory: (config: ConfigService): RedisPubSub =>
        createRedisPubSub(
          config.get<string>('redis.host')!,
          config.get<number>('redis.port')!,
        ),
    },
 
    // Publisher Redis séparé — pour recevoir les events de Laravel
    {
      provide:  REDIS_PUBLISHER,
      inject:   [ConfigService],
      useFactory: (config: ConfigService) =>
        new Redis({
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port'),
          retryStrategy: (t) => Math.min(t * 100, 3000),
        }),
    },
 
    RedisSubscriberService,
  ],
  exports: [REDIS_PUBSUB, REDIS_PUBLISHER, RedisSubscriberService],
})
export class RedisModule {}