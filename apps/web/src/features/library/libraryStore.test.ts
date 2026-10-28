import { beforeEach, describe, expect, it, vi } from 'vitest';

const movie = {
  mediaType: 'movie' as const,
  id: 42,
  title: 'Example Movie',
  posterUrl: '/movie.jpg',
  releaseDate: '2024-03-10',
};

const series = {
  mediaType: 'tv' as const,
  id: 42,
  title: 'Example Series',
  posterUrl: '/series.jpg',
  firstAirDate: '2020-01-02',
};

async function loadStore() {
  vi.resetModules();

  return import('./libraryStore');
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('Personal Library store', () => {
  it('starts empty and exposes stable collection selectors', async () => {
    const store = await loadStore();
    const state = store.useLibraryStore.getState();
    const selectWatchlist = store.selectLibraryCollection('watchlist');

    expect(state.items).toEqual({});
    expect(selectWatchlist(state)).toEqual([]);
    expect(store.selectLibraryCollection('watchlist')).toBe(selectWatchlist);
  });

  it('adds, removes and toggles collection membership independently', async () => {
    const { useLibraryStore } = await loadStore();

    const key = 'movie:42';

    expect(useLibraryStore.getState().add(movie, 'watchlist')).toBe(true);
    expect(useLibraryStore.getState().add(movie, 'favorites')).toBe(true);
    expect(useLibraryStore.getState().has(key, 'watchlist')).toBe(true);
    expect(useLibraryStore.getState().has(key, 'favorites')).toBe(true);
    expect(useLibraryStore.getState().remove(key, 'favorites')).toBe(true);
    expect(useLibraryStore.getState().has(key, 'watchlist')).toBe(true);

    expect(useLibraryStore.getState().toggle(movie, 'watched')).toBe(true);
    expect(useLibraryStore.getState().has(key, 'watched')).toBe(true);
    expect(useLibraryStore.getState().has(key, 'watchlist')).toBe(true);
    expect(useLibraryStore.getState().toggle(movie, 'watched')).toBe(true);
    expect(useLibraryStore.getState().has(key, 'watched')).toBe(false);
  });

  it('removes the record after the final collection is cleared', async () => {
    const { useLibraryStore } = await loadStore();

    useLibraryStore.getState().add(movie, 'watchlist');

    expect(useLibraryStore.getState().remove('movie:42', 'watchlist')).toBe(
      true
    );
    expect(useLibraryStore.getState().items).toEqual({});
  });

  it('keeps movie and TV records with the same TMDB ID separate', async () => {
    const { useLibraryStore } = await loadStore();

    useLibraryStore.getState().add(movie, 'watchlist');
    useLibraryStore.getState().add(series, 'favorites');

    expect(Object.keys(useLibraryStore.getState().items)).toEqual([
      'movie:42',
      'tv:42',
    ]);
    expect(useLibraryStore.getState().has('movie:42', 'favorites')).toBe(false);
    expect(useLibraryStore.getState().has('tv:42', 'favorites')).toBe(true);
  });

  it('rejects invalid identities and collection names without changing state', async () => {
    const { useLibraryStore } = await loadStore();

    const invalidMedia = { ...movie, id: 0 } as unknown as typeof movie;

    const invalidCollection = 'queue' as 'watchlist';

    expect(useLibraryStore.getState().add(invalidMedia, 'watchlist')).toBe(
      false
    );
    expect(useLibraryStore.getState().add(movie, invalidCollection)).toBe(
      false
    );
    expect(
      useLibraryStore.getState().remove('movie:42', invalidCollection)
    ).toBe(false);
    expect(useLibraryStore.getState().remove('movie:042', 'watchlist')).toBe(
      false
    );
    expect(useLibraryStore.getState().has('__proto__', 'watchlist')).toBe(
      false
    );
    expect(useLibraryStore.getState().items).toEqual({});
  });

  it('notifies subscribers and selectors track only their requested membership', async () => {
    const { useLibraryStore, selectLibraryMembership } = await loadStore();

    const notifications = vi.fn();
    const unsubscribe = useLibraryStore.subscribe(notifications);

    const selectMovieFavorite = selectLibraryMembership(
      'movie:42',
      'favorites'
    );

    useLibraryStore.getState().add(movie, 'watchlist');

    expect(notifications).toHaveBeenCalledTimes(1);
    expect(selectMovieFavorite(useLibraryStore.getState())).toBe(false);
    useLibraryStore.getState().add(movie, 'favorites');
    expect(selectMovieFavorite(useLibraryStore.getState())).toBe(true);
    unsubscribe();
  });
});

describe('Personal Library persistence', () => {
  it('writes only minimal state and rehydrates synchronously', async () => {
    const first = await loadStore();
    first.useLibraryStore.getState().add(movie, 'watchlist');

    const raw = localStorage.getItem(first.LIBRARY_STORAGE_KEY);

    expect(raw).not.toBeNull();
    expect(raw).not.toContain('rating');
    expect(raw).not.toContain('genres');

    const second = await loadStore();
    expect(second.useLibraryStore.getState().has('movie:42', 'watchlist')).toBe(
      true
    );
    expect(second.useLibraryStore.getState().items['movie:42']).toMatchObject({
      title: 'Example Movie',
      posterUrl: '/movie.jpg',
      year: 2024,
    });
  });

  it('ignores malformed JSON and reports that saved data could not be read', async () => {
    localStorage.setItem('movie-explorer.personal-library', '{broken');

    const { useLibraryStore } = await loadStore();

    expect(useLibraryStore.getState().items).toEqual({});
    expect(String(useLibraryStore.getState().persistenceWarning)).toMatch(
      /read/i
    );
  });

  it('drops invalid records while retaining valid records in a partial payload', async () => {
    localStorage.setItem(
      'movie-explorer.personal-library',
      JSON.stringify({
        state: {
          items: {
            'movie:42': {
              mediaType: 'movie',
              id: 42,
              title: 'Valid title',
              collections: {
                watchlist: true,
                watched: false,
                favorites: false,
              },
            },
            'tv:43': {
              mediaType: 'tv',
              id: 43,
              title: '',
              collections: {
                watchlist: true,
                watched: false,
                favorites: false,
              },
            },
            'movie:44': {
              mediaType: 'tv',
              id: 44,
              title: 'Wrong identity key',
              collections: {
                watchlist: true,
                watched: false,
                favorites: false,
              },
            },
          },
        },
        version: 1,
      })
    );

    const { useLibraryStore } = await loadStore();

    expect(Object.keys(useLibraryStore.getState().items)).toEqual(['movie:42']);
  });

  it('preserves an unknown future storage version and blocks writes', async () => {
    const payload = JSON.stringify({ state: { keep: true }, version: 99 });
    localStorage.setItem('movie-explorer.personal-library', payload);

    const { useLibraryStore } = await loadStore();
    useLibraryStore.getState().add(movie, 'watchlist');

    expect(localStorage.getItem('movie-explorer.personal-library')).toBe(
      payload
    );
    expect(useLibraryStore.getState().has('movie:42', 'watchlist')).toBe(true);
    expect(String(useLibraryStore.getState().persistenceWarning)).toMatch(
      /newer app/i
    );
  });

  it('keeps working in memory when localStorage is unavailable or writes fail', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage denied');
    });

    const unavailable = await loadStore();
    unavailable.useLibraryStore.getState().add(movie, 'watchlist');

    expect(
      unavailable.useLibraryStore.getState().has('movie:42', 'watchlist')
    ).toBe(true);

    vi.restoreAllMocks();

    const failingWrite = await loadStore();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    });
    failingWrite.useLibraryStore.getState().add(series, 'favorites');

    expect(
      failingWrite.useLibraryStore.getState().has('tv:42', 'favorites')
    ).toBe(true);
    expect(failingWrite.useLibraryStore.getState().persistenceWarning).toMatch(
      /reload/i
    );
  });
});

describe('Personal Library snapshots', () => {
  it('stores minimal movie and series metadata with optional poster and year', async () => {
    const { useLibraryStore } = await loadStore();

    const noOptionalMetadata = {
      mediaType: 'tv' as const,
      id: 77,
      title: 'No poster or year',
    };

    useLibraryStore.getState().add(noOptionalMetadata, 'watchlist');

    expect(useLibraryStore.getState().items['tv:77']).toEqual({
      mediaType: 'tv',
      id: 77,
      title: 'No poster or year',
      collections: { watchlist: true, watched: false, favorites: false },
    });
  });

  it('refreshes snapshots without adding unsaved items or changing collection flags', async () => {
    const { useLibraryStore } = await loadStore();
    useLibraryStore.getState().add(movie, 'watched');
    useLibraryStore.getState().add(movie, 'favorites');

    expect(
      useLibraryStore.getState().updateSnapshot({
        ...movie,
        title: 'Fresh Movie Title',
        posterUrl: '/fresh.jpg',
        releaseDate: '2025-06-01',
      })
    ).toBe(true);
    expect(useLibraryStore.getState().items['movie:42']).toMatchObject({
      title: 'Fresh Movie Title',
      posterUrl: '/fresh.jpg',
      year: 2025,
      collections: { watchlist: false, watched: true, favorites: true },
    });
    expect(
      useLibraryStore.getState().updateSnapshot({ ...series, id: 88 })
    ).toBe(false);
    expect(useLibraryStore.getState().items['tv:88']).toBeUndefined();
  });
});
