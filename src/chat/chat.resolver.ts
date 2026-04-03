// =====================================================================
// src/chat/chat.resolver.ts
// =====================================================================
import { Resolver, Query, Mutation, Subscription, Args, Int, Inject } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { GqlAuthGuard } from '../common/guards/gql-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { REDIS_PUBSUB, SUBSCRIPTION_EVENTS } from '../redis/redis.pubsub';
import { ChatService } from './chat.service';
import {
  ChatMessage,
  ChatConversation,
  MessagesPage,
  SendMessageInput,
} from './dto/chat.model';

@Resolver()
export class ChatResolver {
  constructor(
    private readonly chatService: ChatService,
    @Inject(REDIS_PUBSUB) private readonly pubSub: RedisPubSub,
  ) {}

  // ── Queries ────────────────────────────────────────────────────────

  @Query(() => [ChatConversation])
  @UseGuards(GqlAuthGuard)
  async myConversations(
    @CurrentUser() userId: string,
  ): Promise<ChatConversation[]> {
    return this.chatService.getConversations(userId);
  }

  @Query(() => MessagesPage)
  @UseGuards(GqlAuthGuard)
  async messages(
    @CurrentUser() userId: string,
    @Args('conversationId') conversationId: string,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
  ): Promise<MessagesPage> {
    return this.chatService.getMessages(conversationId, userId, page);
  }

  // ── Mutations ──────────────────────────────────────────────────────

  /**
   * Find or create a conversation with another user, returns the conversation.
   */
  @Mutation(() => ChatConversation)
  @UseGuards(GqlAuthGuard)
  async startConversation(
    @CurrentUser() userId: string,
    @Args('otherUserId') otherUserId: string,
  ): Promise<ChatConversation> {
    return this.chatService.findOrCreateConversation(userId, otherUserId);
  }

  @Mutation(() => ChatMessage)
  @UseGuards(GqlAuthGuard)
  async sendMessage(
    @CurrentUser() userId: string,
    @Args('input') input: SendMessageInput,
  ): Promise<ChatMessage> {
    return this.chatService.sendMessage(input.conversationId, userId, input.content);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async markConversationRead(
    @CurrentUser() userId: string,
    @Args('conversationId') conversationId: string,
  ): Promise<boolean> {
    return this.chatService.markConversationRead(conversationId, userId);
  }

  // ── Subscriptions ──────────────────────────────────────────────────

  /**
   * Fires for every new message in any conversation the user participates in.
   */
  @Subscription(() => ChatMessage, {
    filter: (payload, _vars, context) =>
      payload.participantIds?.includes(context.userId),
    resolve: (payload) => payload[SUBSCRIPTION_EVENTS.CHAT_MESSAGE_ADDED],
  })
  @UseGuards(GqlAuthGuard)
  chatMessageAdded() {
    return this.pubSub.asyncIterableIterator(SUBSCRIPTION_EVENTS.CHAT_MESSAGE_ADDED);
  }

  /**
   * Fires when a conversation the user belongs to is updated
   * (new message, read receipt, etc.).
   */
  @Subscription(() => ChatConversation, {
    filter: (payload, _vars, context) =>
      payload.userId === context.userId,
    resolve: (payload) => payload[SUBSCRIPTION_EVENTS.CHAT_CONVERSATION_UPDATED],
  })
  @UseGuards(GqlAuthGuard)
  chatConversationUpdated() {
    return this.pubSub.asyncIterableIterator(SUBSCRIPTION_EVENTS.CHAT_CONVERSATION_UPDATED);
  }
}
