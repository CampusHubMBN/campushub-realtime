// =====================================================================
// src/chat/dto/chat.model.ts  — GraphQL ObjectTypes (code-first)
// =====================================================================
import { ObjectType, Field, ID, Int, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

// ── Participant info ───────────────────────────────────────────────
@ObjectType()
export class ChatParticipant {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field(() => String, { nullable: true })
  avatarUrl?: string | null;
}

// ── Message ───────────────────────────────────────────────────────
@ObjectType()
export class ChatMessage {
  @Field(() => ID)
  id!: string;

  @Field()
  conversationId!: string;

  @Field()
  senderId!: string;

  @Field()
  content!: string;

  @Field(() => Date, { nullable: true })
  readAt?: Date | null;

  /** True when senderId === requesting user */
  @Field(() => Boolean)
  isOwn!: boolean;

  @Field()
  createdAt!: Date;
}

// ── Conversation summary ───────────────────────────────────────────
@ObjectType()
export class ChatConversation {
  @Field(() => ID)
  id!: string;

  @Field(() => ChatParticipant)
  otherParticipant!: ChatParticipant;

  @Field(() => String, { nullable: true })
  lastMessageContent?: string | null;

  @Field(() => String, { nullable: true })
  lastMessageSenderId?: string | null;

  @Field(() => Date, { nullable: true })
  lastMessageAt?: Date | null;

  /** Unread count for the requesting user */
  @Field(() => Int)
  unreadCount!: number;

  @Field()
  createdAt!: Date;
}

// ── Paginated messages ─────────────────────────────────────────────
@ObjectType()
export class MessagesPage {
  @Field(() => [ChatMessage])
  messages!: ChatMessage[];

  @Field(() => Int)
  total!: number;

  @Field(() => Boolean)
  hasMore!: boolean;
}

// ── Inputs ────────────────────────────────────────────────────────
@InputType()
export class SendMessageInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  conversationId!: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content!: string;
}
