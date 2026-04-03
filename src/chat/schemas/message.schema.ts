// =====================================================================
// src/chat/schemas/message.schema.ts
// =====================================================================
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MessageDocument = HydratedDocument<MessageMongo>;

@Schema({
  collection: 'chat_messages',
  timestamps: { createdAt: true, updatedAt: false },
  versionKey: false,
})
export class MessageMongo {
  @Prop({ required: true, index: true })
  conversationId!: string;

  @Prop({ required: true })
  senderId!: string;

  @Prop({ required: true, maxlength: 2000 })
  content!: string;

  @Prop({ default: null })
  readAt!: Date | null;
}

export const MessageSchema = SchemaFactory.createForClass(MessageMongo);

MessageSchema.index({ conversationId: 1, createdAt: -1 });
