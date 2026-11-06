import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function createApiDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Movie Explorer API')
    .setDescription(
      'Browse movies, series, seasons, episodes and people. Public resources use /api/v1/movies, /api/v1/series, /api/v1/persons, /api/v1/search, /api/v1/ratings, /api/v1/discover and /api/v1/recommendations.',
    )
    .setVersion('1')
    .addGlobalParameters(
      {
        in: 'query',
        name: 'language',
        required: false,
        schema: { type: 'string', enum: ['en-US', 'hu-HU'], default: 'en-US' },
        description:
          'UI-independent content locale. Unsupported values return 400.',
      },
      {
        in: 'query',
        name: 'watchRegion',
        required: false,
        schema: { type: 'string', pattern: '^[A-Z]{2}$', default: 'US' },
        description:
          'Independent streaming market. Discovery provider endpoints also accept their existing region parameter.',
      },
    )
    .build();

  return SwaggerModule.createDocument(app, config);
}
