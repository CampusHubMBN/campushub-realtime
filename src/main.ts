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
 
  // SESSION AUTH: cookie-parser needed for session cookies
  // app.use(cookieParser());

  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3002')
    .split(',')
    .map((o) => o.trim());

  app.enableCors({
    origin: allowedOrigins,
    credentials: false, // TOKEN AUTH: no cookies needed
    // credentials: true, // SESSION AUTH: needed for CSRF/session cookies
  });
 
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
 
  await app.listen(process.env.PORT || 3001);
  console.log(`CampusHub Realtime (GraphQL) on port ${process.env.PORT || 3001}`);
  console.log(`GraphQL Playground: http://localhost:${process.env.PORT || 3001}/graphql`);
}
bootstrap();