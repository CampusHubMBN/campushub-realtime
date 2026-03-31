// =====================================================================
// src/notifications/notifications.module.ts
// =====================================================================
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsResolver } from './notifications.resolver';
import { NotificationsService }  from './notifications.service';
import { NotificationMongo, NotificationMongoSchema } from './notification.schema';
import { PresenceModule } from '../presence/presence.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NotificationMongo.name, schema: NotificationMongoSchema },
    ]),
    TypeOrmModule.forFeature([]),
    PresenceModule,
  ],
  providers: [NotificationsResolver, NotificationsService],
  exports:   [NotificationsService],
})
export class NotificationsModule {}
 