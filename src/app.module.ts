// =====================================================================
// src/app.module.ts
// =====================================================================
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { join } from 'path';
import configuration from './config/configuration';
import { RedisModule } from './redis/redis.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PresenceModule } from './presence/presence.module';
 
@Module({
  imports: [
    // Config
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
 
    // EventEmitter (Laravel Redis events → NestJS internal events)
    EventEmitterModule.forRoot(),
 
    // GraphQL — code-first, subscriptions via WebSocket
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
        sortSchema:     true,
        playground:     true,
        // Subscriptions via graphql-ws (protocol moderne)
        subscriptions: {
          'graphql-ws': {
            path: '/graphql',
            onConnect: async (context: any) => {
              // Passer les cookies au context pour l'auth
              const { connectionParams, extra } = context;
              extra.cookies = connectionParams?.cookies || {};
              extra.headers = connectionParams?.headers || {};
            },
          },
        },
        // Context disponible dans tous les resolvers
        context: ({ req, res, extra }: { req: any, res: any, extra?: any }) => ({
          req,
          res,
          // Pour les subscriptions WebSocket
          ...(extra && { headers: extra.headers, cookies: extra.cookies }),
        }),
      }),
      inject: [ConfigService],
    }),
 
    // MongoDB — notifications persistées
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('mongodb.uri'),
      }),
      inject: [ConfigService],
    }),
 
    // MySQL — même DB que Laravel (read pour résoudre les relations)
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type:        'mysql',
        host:        config.get('database.host'),
        port:        config.get<number>('database.port'),
        database:    config.get('database.name'),
        username:    config.get('database.user'),
        password:    config.get('database.password'),
        entities:    [],
        synchronize: false,
        logging:     false,
      }),
      inject: [ConfigService],
    }),
 
    RedisModule,
    NotificationsModule,
    PresenceModule,
  ],
})
export class AppModule {}