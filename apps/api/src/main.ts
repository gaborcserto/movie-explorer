import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ],
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  const config = new DocumentBuilder()
    .setTitle('Movie Explorer API')
    .setDescription('Search and browse movies with Movie Explorer.')
    .setVersion('0.1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
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
