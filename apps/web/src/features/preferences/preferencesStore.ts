import { create } from 'zustand';
import type { GuestPreferences } from '@movie-explorer/contracts';

import {
  isGuestPreferences,
  readPreferences,
  savePreferences,
} from './preferencesStorage';

interface PreferencesState {
  preferences: GuestPreferences;
  persistenceFailed: boolean;
  updatePreferences: (patch: Partial<GuestPreferences>) => void;
}

const usePreferencesStore = create<PreferencesState>((set, get) => ({
  preferences: readPreferences(),
  persistenceFailed: false,
  updatePreferences: (patch) => {
    const current = get().preferences;
    const preferences = { ...current, ...patch };

    if (
      !isGuestPreferences(preferences) ||
      (preferences.language === current.language &&
        preferences.region === current.region)
    ) {
      return;
    }

    const persistenceFailed = !savePreferences(preferences);
    set({ preferences, persistenceFailed });
  },
}));

export default usePreferencesStore;
