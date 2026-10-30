import { fireEvent, render, screen } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import type {
  MovieDetails,
  PersonDetails,
  SeriesDetails,
} from '@movie-explorer/contracts';

import RouteMetadata, { EntityMetadata } from './index';
import DetailsPageLayout from '../details/detailsPageLayout';
import {
  applyMetadata,
  publicImage,
  serializeJsonLd,
  siteOrigin,
} from '../../seo/metadata';

const movie: MovieDetails = {
  id: 42,
  title: 'A movie <title>',
  description: 'An actual overview.',
  posterUrl: 'https://images.example/movie.jpg',
  cast: [],
  genres: [],
};
const person: PersonDetails = { id: 7, name: 'A Person', filmography: [] };
const series: SeriesDetails = {
  id: 8,
  title: 'A Series',
  mediaType: 'tv',
  originalTitle: null,
  firstAirDate: null,
  posterUrl: null,
  genres: [],
  description: null,
  originalLanguage: null,
  status: null,
  inProduction: null,
  lastAirDate: null,
  seasonCount: null,
  episodeCount: null,
  episodeRuntimeMinutes: [],
  rating: null,
  voteCount: null,
  originCountries: [],
  backdropUrl: null,
  creators: [],
  networks: [],
  productionCompanies: [],
  seasons: [],
};

const content = (selector: string) =>
  document.head.querySelector(selector)?.getAttribute('content');

function renderRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <RouteMetadata />
      <Link to="/library">Library</Link>
      <Link to="/">Home</Link>
      <Routes>
        <Route
          path="/movie/42"
          element={
            <DetailsPageLayout title={movie.title} hero={null}>
              <EntityMetadata kind="movie" data={movie} />
            </DetailsPageLayout>
          }
        />
        <Route
          path="/person/7"
          element={<EntityMetadata kind="person" data={person} />}
        />
        <Route
          path="/series/8"
          element={<EntityMetadata kind="series" data={series} />}
        />
        <Route path="*" element={null} />
      </Routes>
    </MemoryRouter>
  );
}

describe('route metadata', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SITE_URL', 'https://movies.example');
    applyMetadata({ title: 'Movie Explorer' });
  });

  afterEach(() => vi.unstubAllEnvs());

  it('adds homepage canonical and WebSite data without rendering content', () => {
    renderRoute('/');
    expect(document.title).toBe('Movie Explorer');
    expect(content('meta[name="robots"]')).toBe('index, follow');
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://movies.example/'
    );
    expect(
      JSON.parse(document.getElementById('route-structured-data')!.textContent!)
    ).toMatchObject({ '@type': 'WebSite' });
    expect(document.querySelector('main')).toBeNull();
  });

  it.each([
    '/search/hello',
    '/?view=tv&page=2',
    '/?filter=drama',
    '/library',
    '/missing',
    '/series/8/seasons/1',
  ])('excludes %s from indexing', (path) => {
    renderRoute(path);
    expect(content('meta[name="robots"]')).toBe('noindex, follow');
    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
    expect(document.getElementById('route-structured-data')).toBeNull();
  });

  it('uses loaded movie data and removes stale metadata on navigation', () => {
    renderRoute('/movie/42');
    expect(document.title).toBe('A movie <title> | Movie Explorer');
    expect(content('meta[property="og:type"]')).toBe('video.movie');
    expect(content('meta[property="og:image"]')).toBe(movie.posterUrl);
    expect(content('meta[name="twitter:card"]')).toBe('summary_large_image');
    expect(content('meta[name="description"]')).toBe(movie.description);
    expect(
      JSON.parse(document.getElementById('route-structured-data')!.textContent!)
    ).toMatchObject({ '@type': 'Movie', name: movie.title });

    fireEvent.click(screen.getByText('Library'));
    expect(document.title).toBe('Library | Movie Explorer');
    expect(content('meta[name="robots"]')).toBe('noindex, follow');
    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
    expect(document.getElementById('route-structured-data')).toBeNull();
    expect(content('meta[property="og:image"]')).toBeUndefined();

    fireEvent.click(screen.getByText('Home'));
    expect(content('meta[name="robots"]')).toBe('index, follow');
    expect(document.querySelectorAll('meta[name="description"]')).toHaveLength(
      1
    );
    expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
  });

  it.each([
    ['/person/7', 'Person'],
    ['/series/8', 'TVSeries'],
  ])(
    'uses %s domain data without inventing absent images or dates',
    (path, type) => {
      renderRoute(path);
      const schema = JSON.parse(
        document.getElementById('route-structured-data')!.textContent!
      );
      expect(schema['@type']).toBe(type);
      expect(schema).not.toHaveProperty('image');
      expect(schema).not.toHaveProperty('datePublished');
      expect(schema).not.toHaveProperty('aggregateRating');
      expect(content('meta[name="twitter:card"]')).toBe('summary');
    }
  );

  it('canonicalizes entity query variants while excluding them from indexing', () => {
    renderRoute('/movie/42?page=2');
    expect(content('meta[name="robots"]')).toBe('noindex, follow');
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://movies.example/movie/42'
    );
  });

  it('keeps unconfigured preview builds noindex without invented production URLs', () => {
    vi.stubEnv('VITE_SITE_URL', '');
    renderRoute('/movie/42');
    expect(content('meta[name="robots"]')).toBe('noindex, follow');
    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
    expect(document.getElementById('route-structured-data')).toBeNull();
  });

  it('clears entity metadata when data becomes unavailable on the same route', () => {
    const view = render(
      <MemoryRouter>
        <EntityMetadata kind="movie" data={movie} />
      </MemoryRouter>
    );
    view.rerender(<MemoryRouter>{null}</MemoryRouter>);
    expect(content('meta[name="robots"]')).toBe('noindex, follow');
    expect(document.getElementById('route-structured-data')).toBeNull();
    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
  });
});

describe('metadata boundary validation', () => {
  it.each([
    'data:text/html,unsafe',
    'https://user:secret@example.com',
    'https://example.com/path',
    'https://example.com/?q=1',
    'https://example.com/#hash',
  ])('rejects invalid site origin %s', (value) => {
    expect(() => siteOrigin(value)).toThrow();
  });

  it('normalizes origins, rejects unsafe images and escapes inline JSON-LD', () => {
    expect(siteOrigin('https://movies.example/')).toBe(
      'https://movies.example'
    );
    expect(siteOrigin('')).toBeUndefined();
    expect(publicImage('data:text/html,unsafe')).toBeUndefined();
    expect(publicImage('/placeholder.svg')).toBeUndefined();
    expect(
      serializeJsonLd({ name: '</script><script>alert(1)</script>' })
    ).not.toContain('<');
  });
});
