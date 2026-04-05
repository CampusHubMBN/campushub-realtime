// =====================================================================
// src/redis/redis.module.ts
// =====================================================================
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis from 'ioredis';
import { REDIS_PUBSUB, REDIS_PUBLISHER, createRedisPubSub } from './redis.pubsub';
import { RedisSubscriberService } from './redis-subscriber.service';
import { getRedisOptions } from '../config/configuration';

@Global()
@Module({
  providers: [
    // PubSub pour les subscriptions GraphQL
    {
      provide:  REDIS_PUBSUB,
      useFactory: (): RedisPubSub => {
        return createRedisPubSub();
      },
    },

    // Publisher Redis séparé — pour recevoir les events de Laravel
    {
      provide:  REDIS_PUBLISHER,
      useFactory: () => {
        const opts = getRedisOptions();
        return new Redis({ ...opts, retryStrategy: (t) => Math.min(t * 100, 3000) });
      },
    },

    RedisSubscriberService,
  ],
  exports: [REDIS_PUBSUB, REDIS_PUBLISHER, RedisSubscriberService],
})
export class RedisModule {}
