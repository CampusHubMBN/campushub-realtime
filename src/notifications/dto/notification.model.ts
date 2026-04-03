// =====================================================================
// src/notifications/dto/notification.model.ts
// =====================================================================
import { ObjectType, Field, ID } from '@nestjs/graphql';
 
@ObjectType()
export class NotificationData {
  @Field({ nullable: true }) actorName?: string;
  @Field({ nullable: true }) actorId?:   string;
  @Field({ nullable: true }) resourceId?:    string;
  @Field({ nullable: true }) resourceType?:  string;
  @Field({ nullable: true }) resourceTitle?: string;
  @Field()                   message!: string;
}
 
@ObjectType()
export class Notification {
  @Field(() => ID) id!:      string;
  @Field()         userId!:  string;
  @Field()         type!:    string;
  @Field()         data!:    NotificationData;
  @Field()         read!:    boolean;
  @Field({ nullable: true }) readAt?: Date;
  @Field()         createdAt!: Date;
}
 
@ObjectType()
export class NotificationsPage {
  @Field(() => [Notification]) notifications!: Notification[];
  @Field()                     total!:         number;
  @Field()                     unreadCount!:   number;
}
 
@ObjectType()
export class PresenceUpdate {
  @Field() userId!:  string;
  @Field() status!:  string;           // 'online' | 'offline'
  @Field({ nullable: true }) lastSeenAt?: Date;
}
 
@ObjectType()
export class UnreadCountUpdate {
  @Field() userId!: string;
  @Field() count!:  number;
}