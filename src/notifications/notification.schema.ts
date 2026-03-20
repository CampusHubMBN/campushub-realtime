// =====================================================================
// src/notifications/notification.schema.ts
// =====================================================================
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
 
export type NotificationDocument = HydratedDocument<NotificationMongo>;
 
@Schema({ collection: 'notifications', timestamps: { createdAt: true, updatedAt: false }, versionKey: false })
export class NotificationMongo {
  @Prop({ required: true, index: true })   userId:    string;
  @Prop({ required: true })                type:      string;
  @Prop({ type: Object, required: true })  data:      Record<string, any>;
  @Prop({ default: false, index: true })   read:      boolean;
  @Prop({ default: null })                 readAt:    Date | null;
  @Prop({ index: { expireAfterSeconds: 0 } }) expiresAt: Date;
}
 
export const NotificationMongoSchema = SchemaFactory.createForClass(NotificationMongo);
NotificationMongoSchema.index({ userId: 1, read: 1, createdAt: -1 });