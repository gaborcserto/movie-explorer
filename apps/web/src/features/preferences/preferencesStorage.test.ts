import {
  defaultPreferences,
  isGuestPreferences,
  preferencesKey,
  readPreferences,
  savePreferences,
} from './preferencesStorage';

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
});

test('starts in English and US with empty storage', () => {
  expect(readPreferences()).toEqual(defaultPreferences);
});

test('restores language independently of streaming region', () => {
  expect(savePreferences({ language: 'hu-HU', region: 'US' })).toBe(true);
  expect(readPreferences()).toEqual({ language: 'hu-HU', region: 'US' });
});

test.each([
  'null',
  '{}',
  'invalid JSON',
  '{"language":"de-DE","region":"US"}',
  '{"language":"en-US","region":12}',
  '{"language":"en-US","region":"usa"}',
])('rejects invalid or outdated storage: %s', (raw) => {
  localStorage.setItem(preferencesKey, raw);

  expect(readPreferences()).toEqual(defaultPreferences);
});

test('survives inaccessible storage and preserves Library keys', () => {
  localStorage.setItem('library', 'keep');
  savePreferences({ language: 'en-US', region: 'HU' });
  expect(localStorage.getItem('library')).toBe('keep');

  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('denied');
  });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('denied');
  });
  expect(readPreferences()).toEqual(defaultPreferences);
  expect(savePreferences(defaultPreferences)).toBe(false);
});

test('rejects unknown data shapes at the preference boundary', () => {
  expect(isGuestPreferences([])).toBe(false);
  expect(isGuestPreferences({ language: 'en-US', region: 'HU' })).toBe(true);
});
