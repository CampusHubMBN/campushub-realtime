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

  /**
   * Canonical uniqueness key: sorted IDs joined with '_'.
   * Used for the unique index instead of the array field,
   * because a unique index on an array field (multikey) indexes
   * each element separately — causing false duplicate errors.
   */
  @Prop({ type: String, required: true })
  participantKey!: string;

  @Prop({ type: String, default: null })
  lastMessageContent!: string | null;

  @Prop({ type: String, default: null })
  lastMessageSenderId!: string | null;

  @Prop({ type: Date, default: null })
  lastMessageAt!: Date | null;

  /** { [userId]: unreadCount } */
  @Prop({ type: Object, default: {} })
  unreadCounts!: Record<string, number>;
}

export const ConversationSchema = SchemaFactory.createForClass(ConversationMongo);

ConversationSchema.index({ participantKey: 1 }, { unique: true });
ConversationSchema.index({ participants: 1, lastMessageAt: -1 });
