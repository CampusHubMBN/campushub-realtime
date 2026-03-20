// =====================================================================
// src/presence/presence.resolver.ts
// =====================================================================
import { Resolver, Query, Mutation, Subscription, Args } from '@nestjs/graphql';
import { UseGuards, Inject } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { GqlAuthGuard }  from '../common/guards/gql-auth.guard';
import { CurrentUser }   from '../common/decorators/current-user.decorator';
import { PresenceService }   from './presence.service';
import { REDIS_PUBSUB, SUBSCRIPTION_EVENTS } from '../redis/redis.pubsub';
import { PresenceUpdate }    from '../notifications/dto/notification.model';
 
@Resolver()
export class PresenceResolver {
  constructor(
    private readonly presenceService: PresenceService,
    @Inject(REDIS_PUBSUB) private readonly pubSub: RedisPubSub,
  ) {}
 
  // ── Queries ───────────────────────────────────────────────────────
 
  @Query(() => [String])
  @UseGuards(GqlAuthGuard)
  async onlineUsers(): Promise<string[]> {
    return this.presenceService.getOnlineUserIds();
  }
 
  @Query(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async isUserOnline(
    @Args('userId') userId: string,
  ): Promise<boolean> {
    return this.presenceService.isOnline(userId);
  }
 
  // ── Mutations ─────────────────────────────────────────────────────
 
  /** Appelé par le frontend au mount du layout protégé */
  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async setOnline(@CurrentUser() userId: string): Promise<boolean> {
    await this.presenceService.setOnline(userId);
    return true;
  }
 
  /** Appelé au démontage ou déconnexion */
  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async setOffline(@CurrentUser() userId: string): Promise<boolean> {
    await this.presenceService.setOffline(userId);
    return true;
  }
 
  /** Heartbeat — appelé toutes les 2 minutes par le frontend */
  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async heartbeat(@CurrentUser() userId: string): Promise<boolean> {
    await this.presenceService.heartbeat(userId);
    return true;
  }
 
  // ── Subscriptions ─────────────────────────────────────────────────
 
  @Subscription(() => PresenceUpdate, {
    resolve: (payload) => payload[SUBSCRIPTION_EVENTS.PRESENCE_UPDATED],
  })
  @UseGuards(GqlAuthGuard)
  presenceUpdated() {
    return this.pubSub.asyncIterableIterator(SUBSCRIPTION_EVENTS.PRESENCE_UPDATED);
  }
}
 