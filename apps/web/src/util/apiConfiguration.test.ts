import { getMovie } from './apiUtils';

describe('API URL configuration', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it.each([
    [true, undefined, '/api/v1/movies/42'],
    [false, undefined, 'http://localhost:4000/api/v1/movies/42'],
    [true, '', '/api/v1/movies/42'],
    [true, 'https://api.example/', 'https://api.example/api/v1/movies/42'],
  ])(
    'resolves API requests for production=%s and base=%s',
    async (production, base, expected) => {
      vi.stubEnv('PROD', production);
      vi.stubEnv('VITE_API_BASE_URL', base);
      vi.resetModules();
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          id: 42,
          title: 'Movie',
          posterUrl: '',
          genres: [],
          cast: [],
        }),
      });
      vi.stubGlobal('fetch', fetchMock);
      const api: { getMovie: typeof getMovie } = await import('./apiUtils');
      await api.getMovie(42);
      expect(fetchMock).toHaveBeenCalledWith(
        expected,
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    }
  );
});
