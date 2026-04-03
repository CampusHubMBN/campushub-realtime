// =====================================================================
// src/chat/schemas/conversation.schema.ts
// =====================================================================
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ConversationDocument = HydratedDocument<ConversationMongo>;

@Schema({
  collection: 'chat_conversations',
  timestamps: { createdAt: true, updatedAt: false },
  versionKey: false,
})
export class ConversationMongo {
  /** Always 2 user IDs, sorted lexicographically for uniqueness */
  @Prop({ type: [String], required: true })
  participants!: string[];

  @Prop({ default: null })
  lastMessageContent!: string | null;

  @Prop({ default: null })
  lastMessageSenderId!: string | null;

  @Prop({ default: null })
  lastMessageAt!: Date | null;

  /** { [userId]: unreadCount } */
  @Prop({ type: Object, default: {} })
  unreadCounts!: Record<string, number>;
}

export const ConversationSchema = SchemaFactory.createForClass(ConversationMongo);

ConversationSchema.index({ participants: 1 }, { unique: true });
ConversationSchema.index({ participants: 1, lastMessageAt: -1 });
