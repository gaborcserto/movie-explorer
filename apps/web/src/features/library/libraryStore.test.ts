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
    const selectFavorites = store.selectLibraryCollection('favorites');

    expect(state.items).toEqual({});
    expect(selectFavorites(state)).toEqual([]);
    expect(store.selectLibraryCollection('favorites')).toBe(selectFavorites);
  });

  it('adds, removes and toggles collection membership independently', async () => {
    const { useLibraryStore } = await loadStore();

    const key = 'movie:42';

    expect(useLibraryStore.getState().add(movie, 'favorites')).toBe(true);
    expect(useLibraryStore.getState().has(key, 'favorites')).toBe(true);
    expect(useLibraryStore.getState().has(key, 'watched')).toBe(false);

    expect(useLibraryStore.getState().toggle(movie, 'watched')).toBe(true);
    expect(useLibraryStore.getState().has(key, 'watched')).toBe(true);
    expect(useLibraryStore.getState().has(key, 'favorites')).toBe(true);
    expect(useLibraryStore.getState().toggle(movie, 'watched')).toBe(true);
    expect(useLibraryStore.getState().has(key, 'watched')).toBe(false);
    expect(useLibraryStore.getState().remove(key, 'favorites')).toBe(true);
    expect(useLibraryStore.getState().has(key, 'favorites')).toBe(false);
    expect(useLibraryStore.getState().add(movie, 'watched')).toBe(true);
    expect(useLibraryStore.getState().has(key, 'favorites')).toBe(false);
  });

  it('removes the record after the final collection is cleared', async () => {
    const { useLibraryStore } = await loadStore();

    useLibraryStore.getState().add(movie, 'favorites');

    expect(useLibraryStore.getState().remove('movie:42', 'favorites')).toBe(
      true
    );
    expect(useLibraryStore.getState().items).toEqual({});
  });

  it('keeps movie and TV records with the same TMDB ID separate', async () => {
    const { useLibraryStore } = await loadStore();

    useLibraryStore.getState().add(movie, 'watched');
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

    const invalidCollection = 'queue' as 'favorites';

    expect(useLibraryStore.getState().add(invalidMedia, 'favorites')).toBe(
      false
    );
    expect(useLibraryStore.getState().add(movie, invalidCollection)).toBe(
      false
    );
    expect(
      useLibraryStore.getState().remove('movie:42', invalidCollection)
    ).toBe(false);
    expect(useLibraryStore.getState().remove('movie:042', 'favorites')).toBe(
      false
    );
    expect(useLibraryStore.getState().has('__proto__', 'favorites')).toBe(
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

    useLibraryStore.getState().add(movie, 'watched');

    expect(notifications).toHaveBeenCalledTimes(1);
    expect(selectMovieFavorite(useLibraryStore.getState())).toBe(false);
    useLibraryStore.getState().add(movie, 'favorites');
    expect(selectMovieFavorite(useLibraryStore.getState())).toBe(true);
    unsubscribe();
  });
});

describe('Personal Library persistence', () => {
  it('merges legacy saved titles into Favorites, preserves Watched and retains the original payload', async () => {
    const key = 'movie-explorer.personal-library';
    const legacy = JSON.stringify({
      version: 1,
      state: {
        items: {
          'movie:42': {
            ...movie,
            collections: { watchlist: true, favorites: true, watched: true },
          },
          'tv:42': {
            ...series,
            collections: { watchlist: true, favorites: false, watched: false },
          },
          'movie:43': {
            ...movie,
            id: 43,
            collections: { watchlist: false, favorites: false, watched: true },
          },
          invalid: {
            unexpected: 'Preserve even unknown legacy data in backup',
          },
        },
      },
    });
    localStorage.setItem(key, legacy);

    const first = await loadStore();
    expect(
      first.useLibraryStore.getState().items['movie:42'].collections
    ).toEqual({ favorites: true, watched: true });
    expect(first.useLibraryStore.getState().items['tv:42'].collections).toEqual(
      { favorites: true, watched: false }
    );
    expect(
      first.useLibraryStore.getState().items['movie:43'].collections
    ).toEqual({ favorites: false, watched: true });
    expect(Object.keys(first.useLibraryStore.getState().items)).toHaveLength(3);
    expect(localStorage.getItem(`${key}.v1-backup`)).toBe(legacy);
    const migrated = localStorage.getItem(key);
    expect(JSON.parse(migrated ?? '{}').version).toBe(2);
    expect(migrated).not.toContain('watchlist');

    const second = await loadStore();
    expect(second.useLibraryStore.getState().items).toEqual(
      first.useLibraryStore.getState().items
    );
    expect(localStorage.getItem(key)).toBe(migrated);
    expect(localStorage.getItem(`${key}.v1-backup`)).toBe(legacy);

    second.useLibraryStore.getState().remove('tv:42', 'favorites');
    const third = await loadStore();
    expect(third.useLibraryStore.getState().has('tv:42', 'favorites')).toBe(
      false
    );
    expect(third.useLibraryStore.getState().has('movie:42', 'watched')).toBe(
      true
    );
  });

  it('keeps the original v1 data when the migration backup cannot be written', async () => {
    const key = 'movie-explorer.personal-library';
    const original = JSON.stringify({
      version: 1,
      state: {
        items: {
          'movie:42': {
            ...movie,
            collections: { watchlist: true, favorites: false, watched: true },
          },
        },
      },
    });
    localStorage.setItem(key, original);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });

    const { useLibraryStore } = await loadStore();
    expect(useLibraryStore.getState().has('movie:42', 'favorites')).toBe(true);
    expect(useLibraryStore.getState().has('movie:42', 'watched')).toBe(true);
    useLibraryStore.getState().remove('movie:42', 'favorites');
    expect(localStorage.getItem(key)).toBe(original);
    expect(useLibraryStore.getState().persistenceWarning).toMatch(
      /original data is preserved/i
    );
  });

  it('prevents duplicate entries when the same Favorite is saved repeatedly', async () => {
    const { useLibraryStore } = await loadStore();
    useLibraryStore.getState().add(movie, 'favorites');
    useLibraryStore.getState().add(movie, 'favorites');
    expect(Object.keys(useLibraryStore.getState().items)).toEqual(['movie:42']);
  });

  it('writes only minimal state and rehydrates synchronously', async () => {
    const first = await loadStore();
    first.useLibraryStore.getState().add(movie, 'favorites');

    const raw = localStorage.getItem(first.LIBRARY_STORAGE_KEY);

    expect(raw).not.toBeNull();
    expect(raw).not.toContain('rating');
    expect(raw).not.toContain('genres');

    const second = await loadStore();
    expect(second.useLibraryStore.getState().has('movie:42', 'favorites')).toBe(
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
    useLibraryStore.getState().add(movie, 'favorites');

    expect(localStorage.getItem('movie-explorer.personal-library')).toBe(
      payload
    );
    expect(useLibraryStore.getState().has('movie:42', 'favorites')).toBe(true);
    expect(String(useLibraryStore.getState().persistenceWarning)).toMatch(
      /newer app/i
    );
  });

  it('keeps working in memory when localStorage is unavailable or writes fail', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage denied');
    });

    const unavailable = await loadStore();
    unavailable.useLibraryStore.getState().add(movie, 'favorites');

    expect(
      unavailable.useLibraryStore.getState().has('movie:42', 'favorites')
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

    useLibraryStore.getState().add(noOptionalMetadata, 'favorites');

    expect(useLibraryStore.getState().items['tv:77']).toEqual({
      mediaType: 'tv',
      id: 77,
      title: 'No poster or year',
      collections: { watched: false, favorites: true },
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
      collections: { watched: true, favorites: true },
    });
    expect(
      useLibraryStore.getState().updateSnapshot({ ...series, id: 88 })
    ).toBe(false);
    expect(useLibraryStore.getState().items['tv:88']).toBeUndefined();
  });
});
