import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import usePreferencesStore from '../features/preferences/preferencesStore';
import en from '../locales/en.json';
import hu from '../locales/hu.json';

export const supportedLanguages = ['en-US', 'hu-HU'] as const;
export type Language = (typeof supportedLanguages)[number];

export const i18n = createInstance();

// Bundled resources initialize synchronously, including for lazy route consumers.
// No detector: a first visit always starts in English.
i18n.use(initReactI18next).init({
  lng: usePreferencesStore.getState().preferences.language,
  supportedLngs: [...supportedLanguages],
  fallbackLng: 'en-US',
  load: 'currentOnly',
  initAsync: false,
  resources: {
    'en-US': { translation: en },
    'hu-HU': { translation: hu },
  },
  returnNull: false,
  returnEmptyString: false,
  interpolation: { escapeValue: false },
});

function applyDocumentLanguage(language: string) {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = language;
  }
}

applyDocumentLanguage(i18n.language);
usePreferencesStore.subscribe(({ preferences }) => {
  if (i18n.language !== preferences.language) {
    i18n.changeLanguage(preferences.language);
  }

  applyDocumentLanguage(preferences.language);
});
