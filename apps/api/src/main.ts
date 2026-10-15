import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

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
  if (serverUrl.hostname === '::' || serverUrl.hostname === '0.0.0.0') {
    serverUrl.hostname = 'localhost';
  }

  const logger = new Logger('Bootstrap');
  logger.log(`API: ${serverUrl.origin}`);
  logger.log(`Swagger UI: ${serverUrl.origin}/api-docs`);
}
void bootstrap();
