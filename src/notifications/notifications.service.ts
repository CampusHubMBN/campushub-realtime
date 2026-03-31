// =====================================================================
// src/notifications/notifications.service.ts
// =====================================================================
import { Injectable, Logger, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { InjectDataSource } from '@nestjs/typeorm';
import { Model } from 'mongoose';
import { DataSource } from 'typeorm';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { REDIS_PUBSUB, SUBSCRIPTION_EVENTS, LARAVEL_CHANNELS } from '../redis/redis.pubsub';
import { NotificationMongo, NotificationDocument } from './notification.schema';
import { PresenceService } from '../presence/presence.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(NotificationMongo.name)
    private readonly notifModel: Model<NotificationDocument>,
    @Inject(REDIS_PUBSUB)
    private readonly pubSub: RedisPubSub,
    private readonly presenceService: PresenceService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // ── MySQL helpers ─────────────────────────────────────────────────

  private async getUserIdsByRoles(roles: string[]): Promise<string[]> {
    const placeholders = roles.map(() => '?').join(', ');
    const rows: { id: string }[] = await this.dataSource.query(
      `SELECT id FROM users WHERE role IN (${placeholders}) AND deleted_at IS NULL`,
      roles,
    );
    return rows.map((r) => r.id);
  }

  private async getAllUserIds(): Promise<string[]> {
    const rows: { id: string }[] = await this.dataSource.query(
      `SELECT id FROM users WHERE deleted_at IS NULL`,
    );
    return rows.map((r) => r.id);
  }
 
  // ── Persistance ──────────────────────────────────────────────────
 
  private async persist(userId: string, type: string, data: Record<string, any>): 
  Promise<NotificationDocument> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
 
    return this.notifModel.create({ userId, type, data, read: false, readAt: null, expiresAt });
  }
 
  private async pushToUser(userId: string, notif: NotificationDocument) {
    // Push GraphQL subscription
    await this.pubSub.publish(SUBSCRIPTION_EVENTS.NOTIFICATION_ADDED, {
      [SUBSCRIPTION_EVENTS.NOTIFICATION_ADDED]: this.toGql(notif),
      userId,                                  // filtre côté resolver
    });
 
    // Mettre à jour le compteur non-lus
    const count = await this.countUnread(userId);
    await this.pubSub.publish(SUBSCRIPTION_EVENTS.UNREAD_COUNT_UPDATED, {
      [SUBSCRIPTION_EVENTS.UNREAD_COUNT_UPDATED]: { userId, count },
      userId,
    });
  }
 
  // ── Redis event listeners (publiés par Laravel) ───────────────────
 
  @OnEvent(`redis.${LARAVEL_CHANNELS.NOTIFICATIONS}.comment.created`)
  async onCommentCreated(payload: {
    postId: string; postTitle: string;
    authorId: string; authorName: string;
    postOwnerId: string; parentCommentAuthorId?: string;
  }) {
    // Notifier l'auteur du post
    if (payload.postOwnerId !== payload.authorId) {
      const notif = await this.persist(payload.postOwnerId, 'comment.created', {
        actorId:       payload.authorId,
        actorName:     payload.authorName,
        resourceId:    payload.postId,
        resourceType:  'post',
        resourceTitle: payload.postTitle,
        message:       `${payload.authorName} a commenté votre post "${payload.postTitle}"`,
      });
      await this.pushToUser(payload.postOwnerId, notif);
    }
 
    // Notifier l'auteur du commentaire parent si réponse
    if (
      payload.parentCommentAuthorId &&
      payload.parentCommentAuthorId !== payload.authorId &&
      payload.parentCommentAuthorId !== payload.postOwnerId
    ) {
      const notif = await this.persist(payload.parentCommentAuthorId, 'comment.created', {
        actorId:   payload.authorId,
        actorName: payload.authorName,
        message:   `${payload.authorName} a répondu à votre commentaire`,
      });
      await this.pushToUser(payload.parentCommentAuthorId, notif);
    }
  }
 
  @OnEvent(`redis.${LARAVEL_CHANNELS.NOTIFICATIONS}.reaction.added`)
  async onReactionAdded(payload: {
    postId: string; postTitle: string;
    actorId: string; actorName: string;
    postOwnerId: string; reactionType: string;
  }) {
    if (payload.postOwnerId === payload.actorId) return;
    const labels: Record<string, string> = { like: '👍', useful: '💡', bravo: '👏' };
    const notif = await this.persist(payload.postOwnerId, 'reaction.added', {
      actorId:       payload.actorId,
      actorName:     payload.actorName,
      resourceId:    payload.postId,
      resourceType:  'post',
      resourceTitle: payload.postTitle,
      message:       `${payload.actorName} a réagi ${labels[payload.reactionType] ?? ''} à votre post`,
    });
    await this.pushToUser(payload.postOwnerId, notif);
  }
 
  @OnEvent(`redis.${LARAVEL_CHANNELS.NOTIFICATIONS}.application.status_updated`)
  @OnEvent(`redis.${LARAVEL_CHANNELS.NOTIFICATIONS}.application.updated`)
  async onApplicationUpdated(payload: {
    applicationId: string; jobTitle: string;
    applicantId: string; newStatus: string;
  }) {
    const labels: Record<string, string> = {
      reviewed:    'a été consultée',
      shortlisted: 'a été présélectionnée',
      interview:   'a obtenu un entretien',
      accepted:    'a été acceptée 🎉',
      rejected:    "n'a pas été retenue",
    };
    const notif = await this.persist(payload.applicantId, 'application.updated', {
      resourceId:    payload.applicationId,
      resourceType:  'application',
      resourceTitle: payload.jobTitle,
      message:       `Votre candidature pour "${payload.jobTitle}" ${labels[payload.newStatus] ?? `est passée à ${payload.newStatus}`}`,
    });
    await this.pushToUser(payload.applicantId, notif);
  }
 
  @OnEvent(`redis.${LARAVEL_CHANNELS.NOTIFICATIONS}.user.registered`)
  async onUserRegistered(payload: { userId: string; userName: string; userRole: string }) {
    const adminIds = await this.getUserIdsByRoles(['admin']);
    for (const adminId of adminIds) {
      const notif = await this.persist(adminId, 'user.registered', {
        actorId:   payload.userId,
        actorName: payload.userName,
        message:   `Nouveau membre : ${payload.userName} (${payload.userRole})`,
        userRole:  payload.userRole,
      });
      await this.pushToUser(adminId, notif);
    }
  }
 
  @OnEvent(`redis.${LARAVEL_CHANNELS.NOTIFICATIONS}.event.published`)
  async onEventPublished(payload: {
    eventId: string; title: string; body: string;
    location: string; startDate: string; organizerName: string; eventType: string;
  }) {
    const userIds = await this.getAllUserIds();
    for (const userId of userIds) {
      const notif = await this.persist(userId, 'event.published', {
        resourceId:    payload.eventId,
        resourceType:  'event',
        resourceTitle: payload.title,
        message:       `Nouvel événement : "${payload.title}" — ${new Date(payload.startDate).toLocaleDateString('fr-FR')} à ${payload.location}`,
        organizerName: payload.organizerName,
        startDate:     payload.startDate,
        location:      payload.location,
      });
      await this.pushToUser(userId, notif);
    }
  }

  @OnEvent(`redis.${LARAVEL_CHANNELS.NOTIFICATIONS}.post.published`)
  async onPostPublished(payload: {
    postId: string; postTitle: string;
    authorId: string; authorName: string;
  }) {
    const userIds = await this.getUserIdsByRoles(['admin', 'pedagogical']);
    for (const userId of userIds) {
      if (userId === payload.authorId) continue;
      const notif = await this.persist(userId, 'post.published', {
        resourceId:    payload.postId,
        resourceType:  'post',
        resourceTitle: payload.postTitle,
        actorId:       payload.authorId,
        actorName:     payload.authorName,
        message:       `${payload.authorName} a publié un nouveau post : "${payload.postTitle}"`,
      });
      await this.pushToUser(userId, notif);
    }
  }

  @OnEvent(`redis.${LARAVEL_CHANNELS.NOTIFICATIONS}.article.published`)
  async onArticlePublished(payload: {
    articleId: string; articleTitle: string;
    authorId: string; authorName: string;
  }) {
    const userIds = await this.getAllUserIds();
    for (const userId of userIds) {
      if (userId === payload.authorId) continue;
      const notif = await this.persist(userId, 'article.published', {
        resourceId:    payload.articleId,
        resourceType:  'article',
        resourceTitle: payload.articleTitle,
        actorId:       payload.authorId,
        actorName:     payload.authorName,
        message:       `Nouvel article : "${payload.articleTitle}" par ${payload.authorName}`,
      });
      await this.pushToUser(userId, notif);
    }
  }

  @OnEvent(`redis.${LARAVEL_CHANNELS.NOTIFICATIONS}.event.attendance.confirmed`)
  async onEventAttendanceConfirmed(payload: {
    eventId: string; eventTitle: string;
    userId: string; startDate: string; location: string;
  }) {
    const notif = await this.persist(payload.userId, 'event.attendance.confirmed', {
      resourceId:    payload.eventId,
      resourceType:  'event',
      resourceTitle: payload.eventTitle,
      message:       `Votre inscription à "${payload.eventTitle}" a été confirmée ! Rendez-vous le ${new Date(payload.startDate).toLocaleDateString('fr-FR')} à ${payload.location}.`,
    });
    await this.pushToUser(payload.userId, notif);
  }

  @OnEvent(`redis.${LARAVEL_CHANNELS.NOTIFICATIONS}.event.reminder`)
  async onEventReminder(payload: {
    eventId: string; eventTitle: string;
    userId: string; startDate: string; location: string;
  }) {
    const notif = await this.persist(payload.userId, 'event.reminder', {
      resourceId:    payload.eventId,
      resourceType:  'event',
      resourceTitle: payload.eventTitle,
      message:       `Rappel : "${payload.eventTitle}" commence demain à ${payload.location} !`,
    });
    await this.pushToUser(payload.userId, notif);
  }

  @OnEvent(`redis.${LARAVEL_CHANNELS.NOTIFICATIONS}.user.suspended`)
  async onUserSuspended(payload: { userId: string }) {
    // Forcer la déconnexion via subscription
    await this.pubSub.publish(`account.suspended.${payload.userId}`, {
      accountSuspended: { message: 'Votre compte a été suspendu.' },
    });
  }

  @OnEvent(`redis.${LARAVEL_CHANNELS.NOTIFICATIONS}.event.updated`)
  async onEventUpdated(payload: {
    eventId: string; eventTitle: string;
    location: string; startDate: string;
    attendeeIds: string[];
  }) {
    for (const userId of payload.attendeeIds) {
      const notif = await this.persist(userId, 'event.updated', {
        resourceId:    payload.eventId,
        resourceType:  'event',
        resourceTitle: payload.eventTitle,
        message:       `L'événement "${payload.eventTitle}" a été modifié — vérifiez les nouvelles informations.`,
        location:      payload.location,
        startDate:     payload.startDate,
      });
      await this.pushToUser(userId, notif);
    }
  }

  @OnEvent(`redis.${LARAVEL_CHANNELS.NOTIFICATIONS}.event.cancelled`)
  async onEventCancelled(payload: {
    eventId: string; eventTitle: string;
    attendeeIds: string[];
  }) {
    for (const userId of payload.attendeeIds) {
      const notif = await this.persist(userId, 'event.cancelled', {
        resourceId:    payload.eventId,
        resourceType:  'event',
        resourceTitle: payload.eventTitle,
        message:       `L'événement "${payload.eventTitle}" a été annulé.`,
      });
      await this.pushToUser(userId, notif);
    }
  }

  @OnEvent(`redis.${LARAVEL_CHANNELS.NOTIFICATIONS}.application.created`)
  async onApplicationCreated(payload: {
    applicationId: string;
    applicantId:   string;
    jobId:         string;
    jobTitle:      string;
    companyName:   string;
  }) {
    const notif = await this.persist(payload.applicantId, 'application.created', {
      resourceId:    payload.applicationId,
      resourceType:  'application',
      resourceTitle: payload.jobTitle,
      message:       `Votre candidature pour "${payload.jobTitle}" chez ${payload.companyName} a bien été envoyée.`,
      jobId:         payload.jobId,
      companyName:   payload.companyName,
    });

    await this.pushToUser(payload.applicantId, notif);
  }
 
  // ── Queries ───────────────────────────────────────────────────────
 
  async findByUser(userId: string, options?: {
    unreadOnly?: boolean; page?: number; limit?: number;
  }) {
    const { unreadOnly = false, page = 1, limit = 20 } = options ?? {};
    const query: Record<string, any> = { userId };
    if (unreadOnly) query.read = false;
 
    const [notifications, total, unreadCount] = await Promise.all([
      this.notifModel.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      this.notifModel.countDocuments(query),
      this.notifModel.countDocuments({ userId, read: false }),
    ]);
 
    return { notifications: notifications.map(this.toGql), total, unreadCount };
  }
 
  async markAsRead(userId: string, ids?: string[]): Promise<number> {
    const query: Record<string, any> = { userId, read: false };
    if (ids?.length) query._id = { $in: ids };
    const result = await this.notifModel.updateMany(query, { $set: { read: true, readAt: new Date() } });
 
    // Push nouveau compteur
    const count = await this.countUnread(userId);
    await this.pubSub.publish(SUBSCRIPTION_EVENTS.UNREAD_COUNT_UPDATED, {
      [SUBSCRIPTION_EVENTS.UNREAD_COUNT_UPDATED]: { userId, count },
      userId,
    });
 
    return result.modifiedCount;
  }
 
  async countUnread(userId: string): Promise<number> {
    return this.notifModel.countDocuments({ userId, read: false });
  }
 
  // ── Helper ────────────────────────────────────────────────────────
 
  private toGql(doc: any) {
    const d = doc.data ?? {};
    return {
      id:        doc._id?.toString() ?? doc.id,
      userId:    doc.userId,
      type:      doc.type,
      data: {
        message:       d.message       ?? '',
        actorName:     d.actorName     ?? null,
        actorId:       d.actorId       ?? null,
        resourceId:    d.resourceId    ?? null,
        resourceType:  d.resourceType  ?? null,
        resourceTitle: d.resourceTitle ?? null,
      },
      read:      doc.read,
      readAt:    doc.readAt,
      createdAt: doc.createdAt,
    };
  }
}