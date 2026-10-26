import * as fs from 'fs';
import * as path from 'path';
import { getTmdbConfig } from './tmdb.config';

describe('getTmdbConfig', () => {
  it('fails clearly when the TMDB access token is missing', () => {
    expect(() => getTmdbConfig({})).toThrow(
      'Missing required TMDB_ACCESS_TOKEN environment variable',
    );
  });

  it('uses safe defaults for optional TMDB configuration', () => {
    expect(getTmdbConfig({ TMDB_ACCESS_TOKEN: 'token' })).toEqual({
      accessToken: 'token',
      apiBaseUrl: 'https://api.themoviedb.org/3',
      imageBaseUrl: 'https://image.tmdb.org/t/p/w500',
      language: 'en-US',
      region: undefined,
      requestTimeoutMs: 8000,
    });
  });

  it.each(['0', '-1', '1.5', '1e3', ' 8000', '60001', '', 'NaN'])(
    'rejects invalid timeout %s',
    (value) => {
      expect(() =>
        getTmdbConfig({
          TMDB_ACCESS_TOKEN: 'token',
          TMDB_REQUEST_TIMEOUT_MS: value,
        }),
      ).toThrow('TMDB_REQUEST_TIMEOUT_MS');
    },
  );

  it('accepts a configured timeout', () => {
    expect(
      getTmdbConfig({
        TMDB_ACCESS_TOKEN: 'token',
        TMDB_REQUEST_TIMEOUT_MS: '5000',
      }).requestTimeoutMs,
    ).toBe(5000);
  });

  describe('local environment loading', () => {
    const cwd = path.resolve('tmdb-config-test');
    const rootEnvPath = path.resolve(cwd, '.env');
    const apiEnvPath = path.resolve(cwd, 'apps/api/.env');
    let files: Map<string, string>;
    let readFile: jest.SpyInstance;

    beforeEach(() => {
      files = new Map();
      const env = { ...process.env };

      for (const key of Object.keys(env)) {
        if (key.startsWith('TMDB_')) {
          delete env[key];
        }
      }
      jest.replaceProperty(process, 'env', env);
      jest.spyOn(process, 'cwd').mockReturnValue(cwd);
      readFile = jest
        .spyOn(fs, 'readFileSync')
        .mockImplementation((filePath) => {
          const contents = files.get(String(filePath));

          if (contents === undefined) {
            throw Object.assign(new Error('File not found'), {
              code: 'ENOENT',
            });
          }

          return contents;
        });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('prefers runtime variables over API files and API files over root files', () => {
      files.set(
        rootEnvPath,
        'TMDB_ACCESS_TOKEN=root-token\nTMDB_LANGUAGE=fr-FR\nTMDB_REGION=FR',
      );
      files.set(apiEnvPath, 'TMDB_ACCESS_TOKEN=api-token\nTMDB_LANGUAGE=de-DE');
      process.env.TMDB_ACCESS_TOKEN = 'runtime-token';

      expect(getTmdbConfig()).toMatchObject({
        accessToken: 'runtime-token',
        language: 'de-DE',
        region: 'FR',
      });
    });

    it('loads the workspace .env when started from the API directory', () => {
      jest.spyOn(process, 'cwd').mockReturnValue(path.resolve(cwd, 'apps/api'));
      files.set(apiEnvPath, 'TMDB_ACCESS_TOKEN=local-token');

      expect(getTmdbConfig().accessToken).toBe('local-token');
    });

    it('preserves comments, quotes, CRLF lines, and equals signs in values', () => {
      files.set(
        rootEnvPath,
        '\r\n# Local settings\r\ninvalid\r\n=no-key\r\n TMDB_ACCESS_TOKEN = "local=token" \r\nTMDB_LANGUAGE=\'fr-FR\'\r\n',
      );

      expect(getTmdbConfig()).toMatchObject({
        accessToken: 'local=token',
        language: 'fr-FR',
      });
    });

    it('works without local files when credentials are supplied by the runtime', () => {
      process.env.TMDB_ACCESS_TOKEN = 'runtime-token';

      expect(getTmdbConfig().accessToken).toBe('runtime-token');
    });

    it('fails clearly when neither files nor runtime supply credentials', () => {
      expect(() => getTmdbConfig()).toThrow(
        'Missing required TMDB_ACCESS_TOKEN environment variable',
      );
    });

    it('does not fall back to a local token when the runtime token is empty', () => {
      files.set(rootEnvPath, 'TMDB_ACCESS_TOKEN=local-token');
      process.env.TMDB_ACCESS_TOKEN = '';

      expect(() => getTmdbConfig()).toThrow(
        'Missing required TMDB_ACCESS_TOKEN environment variable',
      );
    });

    it('propagates file errors other than missing files', () => {
      const error = Object.assign(new Error('Permission denied'), {
        code: 'EACCES',
      });
      readFile.mockImplementationOnce(() => {
        throw error;
      });

      expect(() => getTmdbConfig()).toThrow(error);
    });

    it('uses an explicit environment without reading local files', () => {
      expect(
        getTmdbConfig({ TMDB_ACCESS_TOKEN: 'test-token' }).accessToken,
      ).toBe('test-token');
      expect(readFile).not.toHaveBeenCalled();
    });
  });
});
