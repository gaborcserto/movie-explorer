import { render, screen, within } from '@testing-library/react';
import type { MovieDetails } from '@movie-explorer/contracts';
import MovieMetadata from './movieMetadata';

const base: MovieDetails = {
  id: 1,
  title: 'Title',
  cast: [],
  genres: [],
  posterUrl: '',
};
function value(label: string) {
  const row = screen.getByText(label, { selector: 'dt' }).parentElement;

  if (!row) {
    throw new Error('Missing metadata row');
  }

  return within(row).getByRole('definition');
}

test('displays original Unicode title, actual status, human-readable language and USD finances', () => {
  render(
    <MovieMetadata
      movie={{
        ...base,
        originalTitle: '千と千尋の神隠し — “Original”',
        status: 'Released',
        originalLanguage: 'en',
        budget: 225000000,
        revenue: 2512865567,
      }}
    />
  );
  expect(value('Original title')).toHaveTextContent(
    '千と千尋の神隠し — “Original”'
  );
  expect(value('Status')).toHaveTextContent('Released');
  expect(value('Original language')).toHaveTextContent('English');
  expect(value('Budget')).toHaveTextContent('$225,000,000');
  expect(value('Revenue')).toHaveTextContent('$2,512,865,567');
  expect(
    screen.getByRole('region', { name: 'Movie information' })
  ).toBeVisible();
});

test.each([undefined, 0, -1, NaN, Infinity])(
  'presents absent or invalid finances %s as Unknown',
  (amount) => {
    render(
      <MovieMetadata movie={{ ...base, budget: amount, revenue: amount }} />
    );
    expect(value('Budget')).toHaveTextContent('Unknown');
    expect(value('Revenue')).toHaveTextContent('Unknown');
    expect(value('Original title')).toHaveTextContent('Unknown');
    expect(value('Status')).toHaveTextContent('Unknown');
    expect(value('Original language')).toHaveTextContent('Unknown');
    expect(screen.queryByText('$0')).toBeNull();
  }
);

test.each(['zz', 'invalid_language!'])(
  'falls back to unsupported language code %s and preserves unfamiliar status',
  (code) => {
    render(
      <MovieMetadata
        movie={{
          ...base,
          originalLanguage: code,
          status: 'Future provider status',
        }}
      />
    );
    expect(value('Original language')).toHaveTextContent(code);
    expect(value('Status')).toHaveTextContent('Future provider status');
  }
);

test('handles a runtime without Intl.DisplayNames', () => {
  const original = Intl.DisplayNames;
  Object.defineProperty(Intl, 'DisplayNames', {
    value: undefined,
    configurable: true,
  });
  try {
    render(<MovieMetadata movie={{ ...base, originalLanguage: 'en' }} />);
    expect(value('Original language')).toHaveTextContent('en');
  } finally {
    Object.defineProperty(Intl, 'DisplayNames', {
      value: original,
      configurable: true,
    });
  }
});
