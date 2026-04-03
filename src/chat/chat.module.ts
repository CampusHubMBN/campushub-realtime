// =====================================================================
// src/chat/chat.module.ts
// =====================================================================
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageMongo, MessageSchema } from './schemas/message.schema';
import { ConversationMongo, ConversationSchema } from './schemas/conversation.schema';
import { ChatService } from './chat.service';
import { ChatResolver } from './chat.resolver';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MessageMongo.name,      schema: MessageSchema },
      { name: ConversationMongo.name, schema: ConversationSchema },
    ]),
    TypeOrmModule.forFeature([]),
  ],
  providers: [ChatResolver, ChatService],
  exports:   [ChatService],
})
export class ChatModule {}
