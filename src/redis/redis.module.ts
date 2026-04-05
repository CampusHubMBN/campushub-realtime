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
      useFactory: (): RedisPubSub => {
        const host     = process.env.REDIS_HOST || 'localhost';
        const port     = parseInt(process.env.REDIS_PORT || '6379', 10);
        const password = process.env.REDIS_PASSWORD || undefined;
        console.log(`[RedisModule] PubSub → ${host}:${port} password=${password ? 'SET' : 'NOT SET'}`);
        return createRedisPubSub(host, port, password);
      },
    },

    // Publisher Redis séparé — pour recevoir les events de Laravel
    {
      provide:  REDIS_PUBLISHER,
      useFactory: () => {
        const host     = process.env.REDIS_HOST || 'localhost';
        const port     = parseInt(process.env.REDIS_PORT || '6379', 10);
        const password = process.env.REDIS_PASSWORD || '';
        const url = password
          ? `redis://:${encodeURIComponent(password)}@${host}:${port}`
          : `redis://${host}:${port}`;
        console.log(`[RedisModule] Publisher → ${host}:${port} password=${password ? 'SET' : 'NOT SET'}`);
        return new Redis(url, { retryStrategy: (t) => Math.min(t * 100, 3000) });
      },
    },

    RedisSubscriberService,
  ],
  exports: [REDIS_PUBSUB, REDIS_PUBLISHER, RedisSubscriberService],
})
export class RedisModule {}
