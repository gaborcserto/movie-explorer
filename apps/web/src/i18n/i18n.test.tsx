import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

import { i18n } from './index';
import en from '../locales/en.json';
import hu from '../locales/hu.json';
import PrimaryNavigation from '../components/navigation';

afterEach(async () => {
  await i18n.changeLanguage('en-US');
});

test('starts in English without browser language detection', () => {
  expect(i18n.language).toBe('en-US');
  expect(i18n.t('navigation.discover')).toBe('Home');
});

test('selects Hungarian and formats Hungarian numbers and plurals', async () => {
  await i18n.changeLanguage('hu-HU');

  expect(i18n.language).toBe('hu-HU');
  expect(i18n.t('navigation.discover')).toBe('Kezdőlap');
  expect(i18n.t('results.count', { count: 1 })).toBe('1 találat');
  expect(i18n.t('results.count', { count: 2 })).toBe('2 találat');
});

test('formats numbers, plurals and interpolation', () => {
  expect(i18n.t('results.count', { count: 1 })).toBe('1 result');
  expect(i18n.t('results.count', { count: 1200 })).toBe('1,200 results');
  expect(i18n.t('results.query', { query: 'Arrival' })).toBe(
    'Results for Arrival'
  );
});

test('has identical English/Hungarian leaf keys and interpolation parameters', () => {
  function leaves(value: object, prefix = ''): Record<string, string> {
    return Object.fromEntries(
      Object.entries(value).flatMap(([key, child]) => {
        const name = prefix ? `${prefix}.${key}` : key;

        return typeof child === 'string'
          ? [[name, child]]
          : Object.entries(leaves(child, name));
      })
    );
  }

  const english = leaves(en);
  const hungarian = leaves(hu);
  expect(Object.keys(hungarian).sort()).toEqual(Object.keys(english).sort());

  for (const [key, text] of Object.entries(english)) {
    expect(hungarian[key].trim()).not.toBe('');
    expect(hungarian[key]).not.toContain('\uFFFD');
    expect(hungarian[key].match(/\{\{[^}]+\}\}/g)?.sort()).toEqual(
      text.match(/\{\{[^}]+\}\}/g)?.sort()
    );
  }
});

test('falls back per key and reports entirely missing keys', async () => {
  const instance = createInstance();
  await instance.init({
    lng: 'hu-HU',
    fallbackLng: 'en-US',
    resources: {
      'en-US': { translation: en },
      'hu-HU': { translation: { navigation: { discover: 'Test fixture' } } },
    },
  });

  expect(instance.t('navigation.discover')).toBe('Test fixture');
  expect(instance.t('navigation.movies')).toBe('Movies');
  expect(instance.exists('absent')).toBe(false);
});

test('renders accessible navigation using the shared instance', () => {
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <PrimaryNavigation mode="home" activeView="discover" />
      </MemoryRouter>
    </I18nextProvider>
  );

  expect(
    screen.getByRole('navigation', { name: 'Main navigation' })
  ).toBeVisible();
  expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute(
    'href',
    '/'
  );
  expect(screen.getByRole('link', { name: 'Library' })).toHaveAttribute(
    'href',
    '/library'
  );
});
