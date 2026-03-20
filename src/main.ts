// =====================================================================
// src/main.ts
// =====================================================================
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
// import * as cookieParser from 'cookie-parser';
 
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
 
  app.use(cookieParser());
 
  app.enableCors({
    origin:      process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });
 
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
 
  await app.listen(process.env.PORT || 3001);
  console.log(`🚀 CampusHub Realtime (GraphQL) on port ${process.env.PORT || 3001}`);
  console.log(`📊 GraphQL Playground: http://localhost:${process.env.PORT || 3001}/graphql`);
}
bootstrap();