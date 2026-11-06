import type { GuestPreferences } from '@movie-explorer/contracts';

export const preferencesKey = 'movie-explorer.preferences.v1';
export const defaultPreferences: GuestPreferences = {
  language: 'en-US',
  region: 'US',
};

export function isGuestPreferences(value: unknown): value is GuestPreferences {
  if (
    !value ||
    typeof value !== 'object' ||
    !('language' in value) ||
    !('region' in value)
  ) {
    return false;
  }

  return (
    (value.language === 'en-US' || value.language === 'hu-HU') &&
    typeof value.region === 'string' &&
    /^[A-Z]{2}$/.test(value.region)
  );
}

// Storage access stays behind this boundary so account persistence can be added later.
export function readPreferences(): GuestPreferences {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(preferencesKey) ?? 'null'
    );

    return isGuestPreferences(value)
      ? { language: value.language, region: value.region }
      : { ...defaultPreferences };
  } catch {
    return { ...defaultPreferences };
  }
}

export function savePreferences(preferences: GuestPreferences): boolean {
  try {
    localStorage.setItem(preferencesKey, JSON.stringify(preferences));

    return true;
  } catch {
    return false;
  }
}
