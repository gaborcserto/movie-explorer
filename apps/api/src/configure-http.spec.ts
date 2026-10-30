import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { configureHttp } from './configure-http';
import { getServerConfig } from './configuration/server.config';
import { HealthController } from './health.controller';

describe('production HTTP configuration', () => {
  let app: INestApplication;

  afterEach(async () => {
    await app?.close();
  });

  async function createApp(env: NodeJS.ProcessEnv) {
    const module = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();
    app = module.createNestApplication();
    configureHttp(app, getServerConfig(env));
    await app.init();
  }

  it('serves a credential-free process health response with security headers', async () => {
    await createApp({ NODE_ENV: 'production' });
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);
    expect(response.body).toEqual({ status: 'ok' });
    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-robots-tag']).toBe('noindex');
  });

  it('does not expose Swagger UI or JSON in production by default', async () => {
    await createApp({ NODE_ENV: 'production' });
    await request(app.getHttpServer()).get('/api-docs').expect(404);
    await request(app.getHttpServer()).get('/api-docs-json').expect(404);
  });

  it('retains explicit Swagger access for development', async () => {
    await createApp({ SWAGGER_ENABLED: 'true' });
    await request(app.getHttpServer()).get('/api-docs').expect(200);
    await request(app.getHttpServer()).get('/api-docs-json').expect(200);
  });

  it('allows only configured browser origins and exposes Retry-After', async () => {
    await createApp({
      NODE_ENV: 'production',
      CORS_ORIGINS: 'https://movies.example',
    });
    const allowed = await request(app.getHttpServer())
      .get('/health')
      .set('Origin', 'https://movies.example')
      .expect(200);
    expect(allowed.headers['access-control-allow-origin']).toBe(
      'https://movies.example',
    );
    expect(allowed.headers['access-control-expose-headers']).toBe(
      'Retry-After',
    );

    const denied = await request(app.getHttpServer())
      .get('/health')
      .set('Origin', 'https://other.example')
      .expect(200);
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
    const preflight = await request(app.getHttpServer())
      .options('/health')
      .set('Origin', 'https://movies.example')
      .set('Access-Control-Request-Method', 'GET')
      .expect(204);
    expect(preflight.headers['access-control-allow-origin']).toBe(
      'https://movies.example',
    );
    expect(preflight.headers['x-powered-by']).toBeUndefined();
    expect(preflight.headers['x-content-type-options']).toBe('nosniff');
    expect(preflight.headers['x-robots-tag']).toBe('noindex');
  });

  it('does not grant local origins production access by default', async () => {
    await createApp({ NODE_ENV: 'production' });
    const response = await request(app.getHttpServer())
      .get('/health')
      .set('Origin', 'http://localhost:5173')
      .expect(200);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});
