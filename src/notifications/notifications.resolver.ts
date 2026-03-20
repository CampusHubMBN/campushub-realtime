// =====================================================================
// src/notifications/notifications.resolver.ts
// =====================================================================
import { Resolver, Query, Mutation, Subscription, Args, Int, Context } from '@nestjs/graphql';
import { UseGuards }  from '@nestjs/common';
import { Inject }     from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { GqlAuthGuard }  from '../common/guards/gql-auth.guard';
import { CurrentUser }   from '../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import { REDIS_PUBSUB, SUBSCRIPTION_EVENTS } from '../redis/redis.pubsub';
import {
  Notification, NotificationsPage, UnreadCountUpdate,
} from './dto/notification.model';
import { MarkReadInput } from './dto/mark-read.input';
 
@Resolver()
export class NotificationsResolver {
  constructor(
    private readonly service: NotificationsService,
    @Inject(REDIS_PUBSUB) private readonly pubSub: RedisPubSub,
  ) {}
 
  // ── Queries ───────────────────────────────────────────────────────
 
  @Query(() => NotificationsPage)
  @UseGuards(GqlAuthGuard)
  async myNotifications(
    @CurrentUser() userId: string,
    @Args('page',       { type: () => Int, defaultValue: 1 })  page:       number,
    @Args('unreadOnly', { defaultValue: false })                unreadOnly: boolean,
  ): Promise<NotificationsPage> {
    return this.service.findByUser(userId, { page, unreadOnly });
  }
 
  @Query(() => Int)
  @UseGuards(GqlAuthGuard)
  async unreadCount(@CurrentUser() userId: string): Promise<number> {
    return this.service.countUnread(userId);
  }
 
  // ── Mutations ─────────────────────────────────────────────────────
 
  @Mutation(() => Int, { description: 'Marquer des notifications comme lues. ids=null → tout marquer.' })
  @UseGuards(GqlAuthGuard)
  async markNotificationsRead(
    @CurrentUser() userId: string,
    @Args('input') input:  MarkReadInput,
  ): Promise<number> {
    return this.service.markAsRead(userId, input.ids);
  }
 
  // ── Subscriptions ─────────────────────────────────────────────────
 
  /** Nouvelle notification pour l'utilisateur connecté */
  @Subscription(() => Notification, {
    filter: (payload, _vars, context) =>
      payload.userId === context.userId,
    resolve: (payload) => payload[SUBSCRIPTION_EVENTS.NOTIFICATION_ADDED],
  })
  @UseGuards(GqlAuthGuard)
  notificationAdded() {
    return this.pubSub.asyncIterableIterator(SUBSCRIPTION_EVENTS.NOTIFICATION_ADDED);
  }
 
  /** Mise à jour du compteur de non-lus */
  @Subscription(() => UnreadCountUpdate, {
    filter: (payload, _vars, context) =>
      payload.userId === context.userId,
    resolve: (payload) => payload[SUBSCRIPTION_EVENTS.UNREAD_COUNT_UPDATED],
  })
  @UseGuards(GqlAuthGuard)
  unreadCountUpdated() {
    return this.pubSub.asyncIterableIterator(SUBSCRIPTION_EVENTS.UNREAD_COUNT_UPDATED);
  }
 
  /** Notifications admin (nouveau user inscrit) */
  @Subscription(() => String, {
    resolve: (payload) => JSON.stringify(payload.adminNotification),
  })
  @UseGuards(GqlAuthGuard)
  adminNotification() {
    return this.pubSub.asyncIterableIterator('adminNotification');
  }
}
 