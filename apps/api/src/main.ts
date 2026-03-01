// .\.\apps\api\src\main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('API_PORT', 3000);
  const allowedOrigins = config.get<string>('ALLOWED_ORIGINS', '').split(',');

  // ─── Préfixe global API ─────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ─── Sécurité : Headers HTTP ────────────────────────────
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'validator.swagger.io'],
          scriptSrc: ["'self'", "'unsafe-inline'"],
        },
      },
    }),
  );

  // ─── Compression (optimisation 3G) ─────────────────────
  app.use(compression());

  // ─── Cookie Parser (refresh tokens) ────────────────────
  app.use(cookieParser(config.get<string>('COOKIE_SECRET')));

  // ─── CORS ───────────────────────────────────────────────
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ─── Validation globale des DTOs ────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ─── Swagger Documentation ──────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('BarberShop API')
    .setDescription('API complète — E-commerce, Réservations, E-learning')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        in: 'header',
      },
      'access-token',
    )
    .addCookieAuth('refresh_token')
    .addTag('Auth', 'Authentification et gestion des sessions')
    .addTag('Users', 'Gestion des utilisateurs')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
    },
  });

  await app.listen(port);

  console.log(`\n🚀 BarberShop API démarrée !`);
  console.log(`   API     : http://localhost:${port}/api/v1`);
  console.log(`   Swagger : http://localhost:${port}/api/docs\n`);
}

void bootstrap();
