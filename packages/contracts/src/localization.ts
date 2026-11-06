export type ContentLanguage = 'en-US' | 'hu-HU';

export interface GuestPreferences {
  language: ContentLanguage;
  region: string;
}
