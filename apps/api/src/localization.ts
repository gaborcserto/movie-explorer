import { AsyncLocalStorage } from 'node:async_hooks';
import type { GuestPreferences } from '@movie-explorer/contracts';

// Keep request preferences isolated while retaining singleton providers and caches.
export const localization = new AsyncLocalStorage<GuestPreferences>();

export function contentLanguage(fallback = 'en-US') {
  return localization.getStore()?.language ?? fallback;
}

export function contentRegion(fallback = 'US') {
  return localization.getStore()?.region ?? fallback;
}

export function localizationKey(key: string | number) {
  return `${contentLanguage()}:${contentRegion()}:${key}`;
}
