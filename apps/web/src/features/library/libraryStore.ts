import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { StateStorage } from 'zustand/middleware';

export type LibraryMediaType = 'movie' | 'tv';
export type LibraryCollection = 'watchlist' | 'watched' | 'favorites';

export type LibraryMedia = {
  mediaType: LibraryMediaType;
  id: number;
  title: string;
  posterUrl?: string | null;
} & (
  | { mediaType: 'movie'; releaseDate?: string }
  | { mediaType: 'tv'; firstAirDate?: string | null }
);

export interface LibraryItem {
  mediaType: LibraryMediaType;
  id: number;
  title: string;
  posterUrl?: string;
  year?: number;
  collections: Record<LibraryCollection, boolean>;
}

interface PersistedLibrary {
  items: Record<string, LibraryItem>;
}

interface LibraryState extends PersistedLibrary {
  persistenceWarning: string | null;
  add: (media: LibraryMedia, collection: LibraryCollection) => boolean;
  remove: (key: string, collection: LibraryCollection) => boolean;
  toggle: (media: LibraryMedia, collection: LibraryCollection) => boolean;
  has: (key: string, collection: LibraryCollection) => boolean;
  updateSnapshot: (media: LibraryMedia) => boolean;
}

export const LIBRARY_STORAGE_KEY = 'movie-explorer.personal-library';
export const LIBRARY_STORAGE_VERSION = 1;

const collections: LibraryCollection[] = ['watchlist', 'watched', 'favorites'];
const mediaTypes: LibraryMediaType[] = ['movie', 'tv'];
let writesBlocked = false;
let warning: string | null = null;
let lastItemsSignature = '{}';
let applyWarning: ((message: string | null) => void) | undefined;

function reportWarning(message: string | null) {
  if (warning === message) {
    return;
  }

  warning = message;
  applyWarning?.(message);
}

export function mediaKey(mediaType: LibraryMediaType, id: number): string {
  return `${mediaType}:${id}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMediaType(value: unknown): value is LibraryMediaType {
  return mediaTypes.includes(value as LibraryMediaType);
}

function isMediaKey(value: string): boolean {
  const match = /^(movie|tv):([1-9]\d*)$/.exec(value);

  if (!match || !isMediaType(match[1])) {
    return false;
  }

  const id = Number(match[2]);

  return Number.isSafeInteger(id) && mediaKey(match[1], id) === value;
}

function isCollection(value: unknown): value is LibraryCollection {
  return collections.includes(value as LibraryCollection);
}

function isValidIdentity(value: unknown): value is LibraryMedia {
  if (!isRecord(value) || !isMediaType(value.mediaType)) {
    return false;
  }

  return (
    typeof value.id === 'number' &&
    Number.isSafeInteger(value.id) &&
    value.id > 0 &&
    typeof value.title === 'string' &&
    value.title.trim().length > 0 &&
    (value.posterUrl === undefined ||
      value.posterUrl === null ||
      typeof value.posterUrl === 'string') &&
    (value.mediaType === 'movie'
      ? value.releaseDate === undefined || typeof value.releaseDate === 'string'
      : value.firstAirDate === undefined ||
        value.firstAirDate === null ||
        typeof value.firstAirDate === 'string')
  );
}

function yearFromDate(date: string | null | undefined): number | undefined {
  const match = date?.match(/^(\d{4})(?:-|$)/);
  const year = match ? Number(match[1]) : undefined;

  return year && year >= 1000 ? year : undefined;
}

function toItem(media: LibraryMedia): Omit<LibraryItem, 'collections'> {
  const year =
    media.mediaType === 'movie'
      ? yearFromDate(media.releaseDate)
      : yearFromDate(media.firstAirDate);

  return {
    mediaType: media.mediaType,
    id: media.id,
    title: media.title.trim(),
    ...(media.posterUrl !== undefined && media.posterUrl !== null
      ? { posterUrl: media.posterUrl }
      : {}),
    ...(year === undefined ? {} : { year }),
  };
}

function isValidStoredItem(value: unknown, key: string): value is LibraryItem {
  if (!isRecord(value) || !isMediaType(value.mediaType)) {
    return false;
  }

  const identityMatches =
    typeof value.id === 'number' &&
    Number.isSafeInteger(value.id) &&
    value.id > 0 &&
    key === mediaKey(value.mediaType, value.id);

  const validSnapshot =
    typeof value.title === 'string' &&
    value.title.trim().length > 0 &&
    (value.posterUrl === undefined || typeof value.posterUrl === 'string') &&
    (value.year === undefined ||
      (typeof value.year === 'number' &&
        Number.isInteger(value.year) &&
        value.year >= 1000 &&
        value.year <= 9999));

  const flags = value.collections;

  const validFlags =
    isRecord(flags) &&
    Object.keys(flags).every((collection) =>
      collections.includes(collection as LibraryCollection)
    ) &&
    collections.every((collection) => typeof flags[collection] === 'boolean');

  return identityMatches && validSnapshot && validFlags;
}

function readItems(value: unknown): Record<string, LibraryItem> {
  if (!isRecord(value) || !isRecord(value.items)) {
    return {};
  }

  const items: Record<string, LibraryItem> = {};

  Object.entries(value.items).forEach(([key, item]) => {
    if (isValidStoredItem(item, key)) {
      items[key] = item;
    }
  });

  return items;
}

const safeStateStorage: StateStorage = {
  getItem(name) {
    try {
      const raw = globalThis.localStorage.getItem(name);

      if (raw === null) {
        return null;
      }

      const parsed: unknown = JSON.parse(raw);

      if (!isRecord(parsed) || typeof parsed.version !== 'number') {
        reportWarning(
          'Saved Personal Library data is invalid and was ignored. Changes may not survive a reload.'
        );

        return null;
      }

      if (parsed.version !== LIBRARY_STORAGE_VERSION) {
        writesBlocked = true;
        reportWarning(
          parsed.version > LIBRARY_STORAGE_VERSION
            ? 'Personal Library data was created by a newer app version. It is preserved, but changes may not survive a reload.'
            : 'Personal Library data uses an unsupported version. It is preserved, but changes may not survive a reload.'
        );
      } else {
        const storedState = isRecord(parsed.state) ? parsed.state : undefined;
        lastItemsSignature = JSON.stringify(storedState?.items ?? {});
        reportWarning(null);
      }

      return raw;
    } catch {
      reportWarning(
        'Personal Library data could not be read from this browser. Changes may not survive a reload.'
      );

      return null;
    }
  },
  setItem(name, value) {
    if (writesBlocked) {
      return;
    }

    try {
      const parsed: unknown = JSON.parse(value);
      const storedState =
        isRecord(parsed) && isRecord(parsed.state) ? parsed.state : undefined;
      const itemsSignature = JSON.stringify(storedState?.items ?? {});

      if (itemsSignature === lastItemsSignature) {
        return;
      }

      globalThis.localStorage.setItem(name, value);
      lastItemsSignature = itemsSignature;
      reportWarning(null);
    } catch {
      reportWarning('Personal Library changes may not survive a reload.');
    }
  },
  removeItem(name) {
    if (writesBlocked) {
      return;
    }

    try {
      globalThis.localStorage.removeItem(name);
    } catch {
      reportWarning('Personal Library changes may not survive a reload.');
    }
  },
};

const libraryStorage = createJSONStorage<PersistedLibrary>(
  () => safeStateStorage
);

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      items: {},
      persistenceWarning: null,
      add(media, collection) {
        if (!isValidIdentity(media) || !isCollection(collection)) {
          return false;
        }

        const key = mediaKey(media.mediaType, media.id);
        const current = get().items[key];

        const snapshot = toItem(media);
        set({
          items: {
            ...get().items,
            [key]: {
              ...current,
              ...snapshot,
              collections: current
                ? { ...current.collections, [collection]: true }
                : {
                    watchlist: collection === 'watchlist',
                    watched: collection === 'watched',
                    favorites: collection === 'favorites',
                  },
            },
          },
        });

        return true;
      },
      remove(key, collection) {
        if (
          typeof key !== 'string' ||
          !isMediaKey(key) ||
          !isCollection(collection)
        ) {
          return false;
        }

        const current = get().items[key];

        if (!current) {
          return false;
        }

        const flags = { ...current.collections, [collection]: false };

        const items = { ...get().items };

        if (collections.every((name) => !flags[name])) {
          delete items[key];
        } else {
          items[key] = { ...current, collections: flags };
        }
        set({ items });

        return true;
      },
      toggle(media, collection) {
        if (!isValidIdentity(media) || !isCollection(collection)) {
          return false;
        }

        const key = mediaKey(media.mediaType, media.id);

        return get().items[key]?.collections[collection]
          ? get().remove(key, collection)
          : get().add(media, collection);
      },
      has(key, collection) {
        if (typeof key !== 'string' || !isCollection(collection)) {
          return false;
        }

        return Boolean(
          isMediaKey(key) && get().items[key]?.collections[collection]
        );
      },
      updateSnapshot(media) {
        if (!isValidIdentity(media)) {
          return false;
        }

        const key = mediaKey(media.mediaType, media.id);
        const current = get().items[key];

        if (!current) {
          return false;
        }

        const snapshot = toItem(media);

        const snapshotIsUnchanged =
          current.title === snapshot.title &&
          (snapshot.posterUrl === undefined ||
            current.posterUrl === snapshot.posterUrl) &&
          (snapshot.year === undefined || current.year === snapshot.year);

        if (snapshotIsUnchanged) {
          return true;
        }

        set({ items: { ...get().items, [key]: { ...current, ...snapshot } } });

        return true;
      },
    }),
    {
      name: LIBRARY_STORAGE_KEY,
      version: LIBRARY_STORAGE_VERSION,
      storage: libraryStorage,
      partialize: ({ items }) => ({ items }),
      merge: (persisted, current) => ({
        ...current,
        items: readItems(persisted),
      }),
      migrate: (persisted, version) => {
        if (version !== LIBRARY_STORAGE_VERSION) {
          reportWarning(
            version > LIBRARY_STORAGE_VERSION
              ? 'Personal Library data was created by a newer app version. It is preserved, but changes may not survive a reload.'
              : 'Saved Personal Library data uses an unsupported version. Changes may not survive a reload.'
          );

          return { items: {} };
        }

        return { items: readItems(persisted) };
      },
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          reportWarning('Personal Library data could not be restored.');
        } else if (state && warning !== state.persistenceWarning) {
          applyWarning?.(warning);
        }
      },
    }
  )
);

applyWarning = (message) => {
  useLibraryStore.setState({ persistenceWarning: message });
};
if (warning !== useLibraryStore.getState().persistenceWarning) {
  applyWarning(warning);
}

const collectionSelectors = new Map<
  LibraryCollection,
  (state: LibraryState) => Array<LibraryItem & { key: string }>
>();

export function selectLibraryCollection(collection: LibraryCollection) {
  let lastItems: Record<string, LibraryItem> | undefined;
  let lastResult: Array<LibraryItem & { key: string }> = [];

  const selector = (state: LibraryState) => {
    if (state.items !== lastItems) {
      lastItems = state.items;
      lastResult = Object.entries(state.items)
        .filter(([, item]) => item.collections[collection])
        .map(([key, item]) => ({ ...item, key }));
    }

    return lastResult;
  };

  const existing = collectionSelectors.get(collection);

  if (existing) {
    return existing;
  }

  collectionSelectors.set(collection, selector);

  return selector;
}

export function selectLibraryMembership(
  key: string,
  collection: LibraryCollection
) {
  return (state: LibraryState) =>
    Boolean(isMediaKey(key) && state.items[key]?.collections[collection]);
}

export function selectLibraryItem(key: string) {
  return (state: LibraryState) =>
    isMediaKey(key) ? state.items[key] : undefined;
}
