import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { SwaggerModule } from '@nestjs/swagger';
import { createApiDocument } from './api-document';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    exposedHeaders: ['Retry-After'],
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ],
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  const document = createApiDocument(app);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(process.env.PORT ?? 4000, process.env.HOST);

  const serverUrl = new URL(await app.getUrl());
  const boundHostname = serverUrl.hostname.replace(/^\[|\]$/gu, '');
  const isLoopbackAddress =
    boundHostname === '::1' ||
    (isIP(boundHostname) === 4 && boundHostname.startsWith('127.'));

  if (!process.env.HOST && isLoopbackAddress) {
    const localhostAddresses = await lookup('localhost', { all: true }).catch(
      () => [],
    );

    if (localhostAddresses.some(({ address }) => address === boundHostname)) {
      serverUrl.hostname = 'localhost';
    }
  }

  const logger = new Logger('Bootstrap');
  logger.log(`API: ${serverUrl.origin}`);
  logger.log(`Swagger UI: ${serverUrl.origin}/api-docs`);
}
void bootstrap();
