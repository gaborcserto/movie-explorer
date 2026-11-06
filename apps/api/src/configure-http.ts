import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';

import { createApiDocument } from './api-document';
import type { getServerConfig } from './configuration/server.config';
import { localization } from './localization';

export function configureHttp(
  app: INestApplication,
  config: ReturnType<typeof getServerConfig>,
) {
  app.use((_request: Request, response: Response, next: NextFunction) => {
    response.removeHeader('X-Powered-By');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Robots-Tag', 'noindex');
    next();
  });
  app.enableCors({ origin: config.origins, exposedHeaders: ['Retry-After'] });
  app.use((request: Request, response: Response, next: NextFunction) => {
    const language = request.query.language ?? 'en-US';
    const region = request.query.watchRegion ?? 'US';

    if (
      (language !== 'en-US' && language !== 'hu-HU') ||
      typeof region !== 'string' ||
      !/^[A-Z]{2}$/.test(region)
    ) {
      response.status(400).json({
        statusCode: 400,
        message: 'Unsupported language or watchRegion',
      });

      return;
    }

    localization.run({ language, region }, next);
  });
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  if (config.swaggerEnabled) {
    SwaggerModule.setup('api-docs', app, createApiDocument(app));
  }
}
