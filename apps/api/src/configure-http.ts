import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';

import { createApiDocument } from './api-document';
import type { getServerConfig } from './configuration/server.config';

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
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  if (config.swaggerEnabled) {
    SwaggerModule.setup('api-docs', app, createApiDocument(app));
  }
}
