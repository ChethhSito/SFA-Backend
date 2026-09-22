import * as dns from 'node:dns';

// Resolver registros SRV de MongoDB Atlas usando DNS públicos de Google y Cloudflare
dns.setServers(['8.8.8.8', '1.1.1.1']);

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );
  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 NestJS SFA-Backend is running on: http://localhost:${port}`);
}
bootstrap();

