// =====================================================================
// src/chat/chat.service.ts
// =====================================================================
import {
  Injectable, Logger, Inject,
  NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectDataSource } from '@nestjs/typeorm';
import { Model } from 'mongoose';
import { DataSource } from 'typeorm';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { REDIS_PUBSUB, SUBSCRIPTION_EVENTS } from '../redis/redis.pubsub';
import { MessageMongo, MessageDocument } from './schemas/message.schema';
import { ConversationMongo, ConversationDocument } from './schemas/conversation.schema';
import { ChatMessage, ChatConversation, ChatParticipant, MessagesPage } from './dto/chat.model';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectModel(MessageMongo.name)
    private readonly msgModel: Model<MessageDocument>,

    @InjectModel(ConversationMongo.name)
    private readonly convModel: Model<ConversationDocument>,

    @Inject(REDIS_PUBSUB)
    private readonly pubSub: RedisPubSub,

    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // ── MySQL helpers ──────────────────────────────────────────────────

  private async getUsersInfo(
    ids: string[],
  ): Promise<{ id: string; name: string; avatarUrl: string | null }[]> {
    if (!ids.length) return [];
    const placeholders = ids.map(() => '?').join(', ');
    const rows: { id: string; name: string; avatar_url: string | null }[] =
      await this.dataSource.query(
        `SELECT u.id, u.name, ui.avatar_url
         FROM users u
         LEFT JOIN user_info ui ON ui.user_id = u.id
         WHERE u.id IN (${placeholders})`,
        ids,
      );
    return rows.map((r) => ({
      id:        String(r.id),
      name:      r.name,
      avatarUrl: r.avatar_url ?? null,
    }));
  }

  // ── Conversations ──────────────────────────────────────────────────

  /**
   * Find or create a 1-to-1 conversation between two users.
   * Participants are always stored sorted to ensure uniqueness.
   */
  async findOrCreateConversation(
    userId: string,
    otherUserId: string,
  ): Promise<ChatConversation> {
    if (userId === otherUserId) {
      throw new BadRequestException('Impossible de démarrer une conversation avec soi-même');
    }

    const [otherUser] = await this.getUsersInfo([otherUserId]);
    if (!otherUser) throw new NotFoundException('Utilisateur introuvable');

    const participants   = [userId, otherUserId].sort();
    const participantKey = participants.join('_');

    const conv = await this.convModel.findOneAndUpdate(
      { participantKey },
      { $setOnInsert: { participants, participantKey, unreadCounts: {} } },
      { upsert: true, returnDocument: 'after' },
    ).lean();

    return this.toConvGql(conv!, userId, new Map([[otherUserId, otherUser]]));
  }

  /**
   * List all conversations for a user, sorted by most recent message.
   */
  async getConversations(userId: string): Promise<ChatConversation[]> {
    const conversations = await this.convModel
      .find({ participants: userId })
      .sort({ lastMessageAt: -1, createdAt: -1 })
      .lean();

    if (!conversations.length) return [];

    const otherIds = conversations.map(
      (c) => c.participants.find((p) => p !== userId) ?? '',
    ).filter(Boolean);

    const users = await this.getUsersInfo([...new Set(otherIds)]);
    const userMap = new Map(users.map((u) => [u.id, u]));

    return conversations.map((c) => this.toConvGql(c, userId, userMap));
  }

  // ── Messages ───────────────────────────────────────────────────────

  /**
   * Paginated messages for a conversation (newest first).
   */
  async getMessages(
    conversationId: string,
    userId: string,
    page = 1,
    limit = 30,
  ): Promise<MessagesPage> {
    const conv = await this.convModel
      .findById(conversationId, { participants: 1 })
      .lean();

    if (!conv || !conv.participants.includes(userId)) {
      throw new ForbiddenException('Accès refusé à cette conversation');
    }

    const [total, messages] = await Promise.all([
      this.msgModel.countDocuments({ conversationId }),
      this.msgModel
        .find({ conversationId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    return {
      messages: messages.map((m) => this.toMsgGql(m, userId)),
      total,
      hasMore: page * limit < total,
    };
  }

  /**
   * Persist a new message, update conversation metadata, and publish subscriptions.
   */
  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
  ): Promise<ChatMessage> {
    const conv = await this.convModel.findById(conversationId).lean();

    if (!conv) throw new NotFoundException('Conversation introuvable');
    if (!conv.participants.includes(senderId)) {
      throw new ForbiddenException('Vous ne faites pas partie de cette conversation');
    }

    const recipientId = conv.participants.find((p) => p !== senderId)!;

    // Persist message
    const message = await this.msgModel.create({
      conversationId,
      senderId,
      content,
      readAt: null,
    });

    // Update conversation: last message + increment recipient unread count
    const currentUnread = (conv.unreadCounts ?? {})[recipientId] ?? 0;
    await this.convModel.findByIdAndUpdate(conversationId, {
      lastMessageContent:   content,
      lastMessageSenderId:  senderId,
      lastMessageAt:        message.createdAt,
      [`unreadCounts.${recipientId}`]: currentUnread + 1,
      [`unreadCounts.${senderId}`]:    0,
    });

    const msgGql = this.toMsgGql(message.toObject(), senderId);

    // Subscription: new message (both participants receive it)
    await this.pubSub.publish(SUBSCRIPTION_EVENTS.CHAT_MESSAGE_ADDED, {
      [SUBSCRIPTION_EVENTS.CHAT_MESSAGE_ADDED]: msgGql,
      conversationId,
      participantIds: conv.participants,
    });

    // Subscription: conversation updated (one event per participant, personalized)
    await this._publishConversationUpdated(conversationId, senderId, recipientId);

    return msgGql;
  }

  /**
   * Mark all unread messages in a conversation as read for a user.
   */
  async markConversationRead(
    conversationId: string,
    userId: string,
  ): Promise<boolean> {
    const conv = await this.convModel.findById(conversationId).lean();

    if (!conv || !conv.participants.includes(userId)) {
      throw new ForbiddenException('Accès refusé');
    }

    await Promise.all([
      this.msgModel.updateMany(
        { conversationId, senderId: { $ne: userId }, readAt: null },
        { readAt: new Date() },
      ),
      this.convModel.findByIdAndUpdate(conversationId, {
        [`unreadCounts.${userId}`]: 0,
      }),
    ]);

    const otherUserId = conv.participants.find((p) => p !== userId)!;
    await this._publishConversationUpdated(conversationId, userId, otherUserId);

    return true;
  }

  // ── Internal subscription helpers ─────────────────────────────────

  private async _publishConversationUpdated(
    conversationId: string,
    userAId: string,
    userBId: string,
  ): Promise<void> {
    const conv = await this.convModel.findById(conversationId).lean();
    if (!conv) return;

    const users = await this.getUsersInfo([userAId, userBId]);
    const userMap = new Map(users.map((u) => [u.id, u]));

    for (const userId of [userAId, userBId]) {
      const convGql = this.toConvGql(conv, userId, userMap);
      await this.pubSub.publish(SUBSCRIPTION_EVENTS.CHAT_CONVERSATION_UPDATED, {
        [SUBSCRIPTION_EVENTS.CHAT_CONVERSATION_UPDATED]: convGql,
        userId,
      });
    }
  }

  // ── Serializers ────────────────────────────────────────────────────

  toMsgGql(doc: any, requestingUserId: string): ChatMessage {
    return {
      id:             doc._id?.toString() ?? doc.id,
      conversationId: doc.conversationId,
      senderId:       doc.senderId,
      content:        doc.content,
      readAt:         doc.readAt ?? null,
      isOwn:          doc.senderId === requestingUserId,
      createdAt:      doc.createdAt,
    };
  }

  toConvGql(
    doc: any,
    requestingUserId: string,
    userMap: Map<string, { id: string; name: string; avatarUrl: string | null }>,
  ): ChatConversation {
    const otherId = (doc.participants as string[]).find((p) => p !== requestingUserId) ?? '';
    const other   = userMap.get(otherId);

    const otherParticipant: ChatParticipant = other
      ? { id: other.id, name: other.name, avatarUrl: other.avatarUrl }
      : { id: otherId, name: 'Utilisateur', avatarUrl: null };

    const unreadCount = (doc.unreadCounts ?? {})[requestingUserId] ?? 0;

    return {
      id:                  doc._id?.toString() ?? doc.id,
      otherParticipant,
      lastMessageContent:  doc.lastMessageContent ?? null,
      lastMessageSenderId: doc.lastMessageSenderId ?? null,
      lastMessageAt:       doc.lastMessageAt ?? null,
      unreadCount,
      createdAt:           doc.createdAt,
    };
  }
}
