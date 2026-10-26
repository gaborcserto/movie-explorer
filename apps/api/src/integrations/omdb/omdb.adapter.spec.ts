import { loadLocalEnv } from '../../configuration/local-env';
import { OmdbAdapter } from './omdb.adapter';

jest.mock('../../configuration/local-env', () => ({
  loadLocalEnv: jest.fn(),
}));

const id = 'tt0133093';
const valid = {
  Response: 'True',
  imdbID: id,
  Type: 'movie',
  imdbRating: '8.7',
  imdbVotes: '2,100,123',
};

describe('OmdbAdapter', () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    const env = { ...process.env };
    delete env.OMDB_API_KEY;
    delete env.OMDB_API_URL;
    jest.replaceProperty(process, 'env', env);

    jest.mocked(loadLocalEnv).mockReset().mockReturnValue({});
    fetchMock = jest
      .spyOn(global, 'fetch')
      .mockRejectedValue(new Error('Unexpected fetch'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('loads defaults from one local environment snapshot and trims them', async () => {
    jest.mocked(loadLocalEnv).mockReturnValueOnce({
      OMDB_API_KEY: ' local-key ',
      OMDB_API_URL: ' https://local.example/api/ ',
    });
    fetchMock.mockResolvedValue(Response.json(valid));

    const adapter = new OmdbAdapter();
    await adapter.findRating(id, 'movie');

    expect(adapter.enabled).toBe(true);
    expect(loadLocalEnv).toHaveBeenCalledTimes(1);
    const url = fetchMock.mock.calls[0][0] as URL;
    expect(url.origin).toBe('https://local.example');
    expect(url.pathname).toBe('/api/');
    expect(url.searchParams.get('apikey')).toBe('local-key');
  });

  it('prefers runtime key and URL over local configuration', async () => {
    jest.mocked(loadLocalEnv).mockReturnValue({
      OMDB_API_KEY: 'local-key',
      OMDB_API_URL: 'https://local.example/',
    });
    process.env.OMDB_API_KEY = ' runtime-key ';
    process.env.OMDB_API_URL = ' https://runtime.example/ ';
    fetchMock.mockResolvedValue(Response.json(valid));

    await new OmdbAdapter().findRating(id, 'movie');

    const url = fetchMock.mock.calls[0][0] as URL;
    expect(url.origin).toBe('https://runtime.example');
    expect(url.searchParams.get('apikey')).toBe('runtime-key');
    expect(loadLocalEnv).toHaveBeenCalledTimes(1);
  });

  it('uses explicit overrides without loading environment configuration', async () => {
    process.env.OMDB_API_KEY = 'runtime-key';
    process.env.OMDB_API_URL = 'invalid';
    fetchMock.mockResolvedValue(Response.json(valid));

    await new OmdbAdapter(
      'override-key',
      'https://override.example/',
    ).findRating(id, 'movie');

    const url = fetchMock.mock.calls[0][0] as URL;
    expect(url.origin).toBe('https://override.example');
    expect(url.searchParams.get('apikey')).toBe('override-key');
    expect(loadLocalEnv).not.toHaveBeenCalled();
  });

  it('defaults only the key when an explicit URL is supplied', async () => {
    jest.mocked(loadLocalEnv).mockReturnValue({ OMDB_API_KEY: ' local-key ' });
    fetchMock.mockResolvedValue(Response.json(valid));

    await new OmdbAdapter(undefined, 'https://override.example/').findRating(
      id,
      'movie',
    );

    const url = fetchMock.mock.calls[0][0] as URL;
    expect(url.origin).toBe('https://override.example');
    expect(url.searchParams.get('apikey')).toBe('local-key');
    expect(loadLocalEnv).toHaveBeenCalledTimes(1);
  });

  it.each([undefined, '', '   '])(
    'disables fetching for a missing or blank key %p',
    async (apiKey) => {
      if (apiKey !== undefined) {
        process.env.OMDB_API_KEY = apiKey;
        jest
          .mocked(loadLocalEnv)
          .mockReturnValue({ OMDB_API_KEY: 'local-key' });
      }

      const adapter = new OmdbAdapter();

      expect(adapter.enabled).toBe(false);
      await expect(adapter.findRating(id, 'movie')).resolves.toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it('keeps an explicit empty key disabled despite an environment key', async () => {
    process.env.OMDB_API_KEY = 'runtime-key';
    const adapter = new OmdbAdapter('');

    expect(adapter.enabled).toBe(false);
    await expect(adapter.findRating(id, 'movie')).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses the default URL when a blank runtime URL overrides a local URL', async () => {
    jest.mocked(loadLocalEnv).mockReturnValue({
      OMDB_API_URL: 'https://local.example/',
    });
    process.env.OMDB_API_URL = '   ';
    fetchMock.mockResolvedValue(Response.json(valid));

    await new OmdbAdapter('test-key').findRating(id, 'movie');

    expect((fetchMock.mock.calls[0][0] as URL).origin).toBe(
      'https://www.omdbapi.com',
    );
  });

  it.each(['movie', 'series'] as const)(
    'normalizes %s scores and votes using only the IMDb ID',
    async (kind) => {
      fetchMock.mockResolvedValue(Response.json({ ...valid, Type: kind }));
      await expect(
        new OmdbAdapter('test-key').findRating(id, kind),
      ).resolves.toEqual({ score: 8.7, voteCount: 2100123 });
      const url = fetchMock.mock.calls[0][0] as URL;
      expect(url.origin).toBe('https://www.omdbapi.com');
      expect(url.searchParams.get('i')).toBe(id);
      expect(url.searchParams.get('type')).toBe(kind);
      expect(url.searchParams.has('t')).toBe(false);
      expect(fetchMock.mock.calls[0][1]).toMatchObject({ redirect: 'error' });
    },
  );

  it('uses a configured HTTPS API URL', async () => {
    process.env.OMDB_API_URL = 'https://omdb-proxy.example/api/';
    fetchMock.mockResolvedValue(Response.json(valid));

    await new OmdbAdapter('test-key').findRating(id, 'movie');

    const url = fetchMock.mock.calls[0][0] as URL;
    expect(url.origin).toBe('https://omdb-proxy.example');
    expect(url.pathname).toBe('/api/');
    expect(url.searchParams.get('apikey')).toBe('test-key');
  });

  it.each([undefined, ''])('defaults the API URL for %p', async (apiUrl) => {
    if (apiUrl === '') {
      process.env.OMDB_API_URL = '';
    }
    fetchMock.mockResolvedValue(Response.json(valid));

    await new OmdbAdapter('test-key').findRating(id, 'movie');

    expect((fetchMock.mock.calls[0][0] as URL).origin).toBe(
      'https://www.omdbapi.com',
    );
  });

  it.each([
    'not a URL',
    'http://omdb.example/',
    'https://user:password@omdb.example/',
    'https://omdb.example/?apikey=leak',
    'https://omdb.example/#fragment',
  ])('rejects unsafe API URL configuration %s', (apiUrl) => {
    process.env.OMDB_API_URL = apiUrl;
    expect(() => new OmdbAdapter('test-key')).toThrow('OMDB_API_URL');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['N/A', '', '-1', '10.1', 'Infinity', '8.5junk', null, 8])(
    'rejects invalid rating %p',
    async (imdbRating) => {
      fetchMock.mockResolvedValue(Response.json({ ...valid, imdbRating }));
      await expect(
        new OmdbAdapter('key').findRating(id, 'movie'),
      ).resolves.toBeNull();
    },
  );

  it.each(['N/A', '-1', '1,23', '2.5', '9007199254740992', null])(
    'keeps the rating with invalid votes %p',
    async (imdbVotes) => {
      fetchMock.mockResolvedValue(Response.json({ ...valid, imdbVotes }));
      await expect(
        new OmdbAdapter('key').findRating(id, 'movie'),
      ).resolves.toEqual({ score: 8.7, voteCount: null });
    },
  );

  it.each([
    { ...valid, imdbRating: undefined },
    { ...valid, imdbID: 'tt0000001' },
    { ...valid, Type: 'series' },
    { Response: 'False', Error: 'Invalid API key!' },
    { Response: 'False', Error: 'Movie not found!' },
    { Response: 'False', Error: 'Request limit reached!' },
    null,
    [],
  ])('ignores unavailable or mismatched responses %p', async (body) => {
    fetchMock.mockResolvedValue(Response.json(body));
    await expect(
      new OmdbAdapter('key').findRating(id, 'movie'),
    ).resolves.toBeNull();
  });

  it.each([401, 429, 503])('degrades HTTP %s to null', async (status) => {
    fetchMock.mockResolvedValue(new Response('', { status }));
    await expect(
      new OmdbAdapter('key').findRating(id, 'movie'),
    ).resolves.toBeNull();
  });

  it('handles network and malformed JSON failures', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(new Response('invalid'));
    await expect(
      new OmdbAdapter('key').findRating(id, 'movie'),
    ).resolves.toBeNull();
    await expect(
      new OmdbAdapter('key').findRating(id, 'movie'),
    ).resolves.toBeNull();
  });

  it('aborts timed out requests', async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementation(
      (_url, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(new Error('aborted')),
          );
        }),
    );

    const result = new OmdbAdapter('key').findRating(id, 'movie');
    await jest.advanceTimersByTimeAsync(3000);

    await expect(result).resolves.toBeNull();
  });

  it('deduplicates concurrent requests, caches for an hour, then refreshes', async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementation(() => Promise.resolve(Response.json(valid)));
    const adapter = new OmdbAdapter('key');

    await Promise.all([
      adapter.findRating(id, 'movie'),
      adapter.findRating(id, 'movie'),
    ]);
    await adapter.findRating(id, 'movie');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(3_600_001);
    await adapter.findRating(id, 'movie');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries failures after a minute', async () => {
    jest.useFakeTimers();
    fetchMock.mockRejectedValue(new Error('offline'));
    const adapter = new OmdbAdapter('key');

    await adapter.findRating(id, 'movie');
    await adapter.findRating(id, 'movie');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(60_001);
    await adapter.findRating(id, 'movie');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('makes no request without a key or valid IMDb ID', async () => {
    await expect(
      new OmdbAdapter('').findRating(id, 'movie'),
    ).resolves.toBeNull();
    await expect(
      new OmdbAdapter('key').findRating('603', 'movie'),
    ).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
