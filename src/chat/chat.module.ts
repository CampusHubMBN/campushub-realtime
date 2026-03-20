// =====================================================================
// src/chat/chat.module.ts  — Scaffold pour plus tard
// =====================================================================
import { Module } from '@nestjs/common';
 
// Chat module — sera implémenté avec :
//   - MongoDB schema Message (conversation_id, sender_id, content, createdAt)
//   - ChatResolver (Query messages, Mutation sendMessage, Subscription messageAdded)
//   - ChatService (persist + pubSub.publish)
 
@Module({})
export class ChatModule {}