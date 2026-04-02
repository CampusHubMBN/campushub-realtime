// =====================================================================
// src/redis/redis.pubsub.ts
// =====================================================================
// RedisPubSub — implémentation GraphQL subscriptions via Redis
// Permet le scale horizontal (plusieurs instances NestJS)
// =====================================================================
import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis from 'ioredis';

// Tokens d'injection
export const REDIS_PUBSUB   = 'REDIS_PUBSUB';
export const REDIS_PUBLISHER = 'REDIS_PUBLISHER';
export const LARAVEL_CHANNELS = {
  NOTIFICATIONS: 'campushub:notifications',
} as const;

// Events GraphQL subscription
export const SUBSCRIPTION_EVENTS = {
  NOTIFICATION_ADDED:   'notificationAdded',
  PRESENCE_UPDATED:     'presenceUpdated',
  UNREAD_COUNT_UPDATED: 'unreadCountUpdated',
} as const;

// Factory pour créer le RedisPubSub
export function createRedisPubSub(host: string, port: number, password?: string): RedisPubSub {
  const options = {
    host,
    port,
    password,
    retryStrategy: (times: number) => Math.min(times * 100, 3000),
  };

  return new RedisPubSub({
    publisher:  new Redis(options),
    subscriber: new Redis(options),
  });
}
