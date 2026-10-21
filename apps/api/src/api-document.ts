import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function createApiDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Movie Explorer API')
    .setDescription(
      'Browse movies, series, seasons, episodes and people. Public resources use /api/v1/movies, /api/v1/series, /api/v1/persons and /api/v1/search.',
    )
    .setVersion('1')
    .build();
  return SwaggerModule.createDocument(app, config);
}
