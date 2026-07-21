import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import helmet from 'helmet';
import compression = require('compression');
import cookieParser = require('cookie-parser');
import { rateLimit } from 'express-rate-limit';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ─── Config ──────────────────────────────────────────────────────────────────
  // Read typed environment variables via ConfigService (backed by .env)
  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 5000);
  const clientUrl = config.get<string>('CLIENT_URL', 'http://localhost:3000');
  const nodeEnv = config.get<string>('NODE_ENV', 'development');
  const isDev = nodeEnv !== 'production';

  // ─── Security: Helmet ────────────────────────────────────────────────────────
  // Relax CSP only in development so Swagger UI (inline scripts) can load.
  // In production, the full strict policy is applied.
  app.use(
    helmet({
      contentSecurityPolicy: isDev ? false : undefined,
    }),
  );

  // ─── Compression ─────────────────────────────────────────────────────────────
  // Gzip / Brotli compression for all responses – reduces payload size
  app.use(compression());

  // ─── Cookie Parser ───────────────────────────────────────────────────────────
  // Parses Cookie header and populates req.cookies / req.signedCookies
  const cookieSecret = config.get<string>('COOKIE_SECRET', 'super-secret-cookie-signing-key-123456789');
  app.use(cookieParser(cookieSecret));


  // ─── Rate Limiting ───────────────────────────────────────────────────────────
  // Limits each IP to 100 requests per 15 minutes (protects against brute force)
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100,                  // max requests per window per IP
      standardHeaders: true,     // Return rate-limit info in `RateLimit-*` headers
      legacyHeaders: false,      // Disable `X-RateLimit-*` headers
      message: 'Too many requests from this IP, please try again later.',
    }),
  );

  // ─── CORS ────────────────────────────────────────────────────────────────────
  // Allow only the configured client origin; credentials (cookies/auth) enabled
  app.enableCors({
    origin: clientUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // ─── Global API Prefix ───────────────────────────────────────────────────────
  // All routes are prefixed with /api/v1.0
  // e.g. http://localhost:5000/api/v1.0/users
  app.setGlobalPrefix('api/v1.0');

  // ─── Global Validation Pipe ──────────────────────────────────────────────────
  // Validates & transforms incoming request payloads automatically via class-validator
  // whitelist         – strips unknown properties not decorated with @IsXxx()
  // forbidNonWhitelisted – throws 400 if unknown properties are present
  // transform         – auto-transforms plain objects to DTO class instances
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ─── Swagger / OpenAPI ───────────────────────────────────────────────────────
  // Only expose docs in non-production environments.
  // UI available at: http://localhost:5000/api/v1.0/docs
  // JSON spec at:   http://localhost:5000/api/v1.0/docs-json
  if (isDev) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Idea2System API')
      .setDescription('Core API – OpenAPI / Swagger documentation')
      .setVersion('1.0')
      .addServer(`http://localhost:${port}`, 'Local Development')
      // Bearer JWT auth – click "Authorize" in the UI to set a token
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);

    SwaggerModule.setup('api/v1.0/docs', app, document, {
      // Swagger UI options
      swaggerOptions: {
        persistAuthorization: true,   // keeps the token across page refreshes
        docExpansion: 'none',         // collapse all sections by default
        filter: true,                 // enable endpoint search bar
        showRequestDuration: true,    // shows response time per request
      },
      customSiteTitle: 'Idea2System API Docs',
    });
  }

  // ─── Start ───────────────────────────────────────────────────────────────────
  await app.listen(port);
  console.log(`🚀 Server       → http://localhost:${port}/api/v1.0`);
  if (isDev) {
    console.log(`📖 Swagger UI   → http://localhost:${port}/api/v1.0/docs`);
    console.log(`📄 OpenAPI JSON → http://localhost:${port}/api/v1.0/docs-json`);
  }
}

bootstrap();

