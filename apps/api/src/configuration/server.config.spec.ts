import { getServerConfig } from './server.config';

describe('server configuration', () => {
  it('preserves local development defaults', () => {
    expect(getServerConfig({})).toEqual({
      port: 4000,
      host: undefined,
      origins: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
      ],
      swaggerEnabled: true,
    });
  });

  it('disables Swagger and cross-origin access by default in production', () => {
    expect(getServerConfig({ NODE_ENV: 'production' })).toMatchObject({
      origins: [],
      swaggerEnabled: false,
    });
  });

  it('accepts explicit production overrides and an empty same-origin allowlist', () => {
    expect(
      getServerConfig({
        NODE_ENV: 'production',
        PORT: '8080',
        HOST: '0.0.0.0',
        CORS_ORIGINS: 'https://movies.example, https://www.movies.example',
        SWAGGER_ENABLED: 'true',
      }),
    ).toEqual({
      port: 8080,
      host: '0.0.0.0',
      origins: ['https://movies.example', 'https://www.movies.example'],
      swaggerEnabled: true,
    });
    expect(
      getServerConfig({ CORS_ORIGINS: '', SWAGGER_ENABLED: 'false' }),
    ).toMatchObject({ origins: [], swaggerEnabled: false });
  });

  it.each(['', '0', '65536', '4.2', '-1', 'pipe-name'])(
    'rejects invalid PORT %s',
    (port) => {
      expect(() => getServerConfig({ PORT: port })).toThrow('PORT');
    },
  );

  it.each([
    '*',
    'null',
    'https://movies.example/',
    'https://user:password@movies.example',
    'https://movies.example/path',
    'https://movies.example?query=1',
  ])('rejects invalid CORS origin %s', (origin) => {
    expect(() => getServerConfig({ CORS_ORIGINS: origin })).toThrow(
      'CORS_ORIGINS',
    );
  });

  it('rejects ambiguous Swagger configuration', () => {
    expect(() => getServerConfig({ SWAGGER_ENABLED: 'yes' })).toThrow(
      'SWAGGER_ENABLED',
    );
  });
});
