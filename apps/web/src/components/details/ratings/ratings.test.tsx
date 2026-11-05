import { render, screen } from '@testing-library/react';

import DetailsRatings, { RatingsDisplay } from './ratings';

test('keeps the source badges accessible and formats scores and votes', () => {
  render(<RatingsDisplay tmdb={8} imdb={{ score: 7.85, voteCount: 100 }} />);

  expect(
    screen.getByLabelText('TMDB rating: 8.0 out of 10')
  ).toBeInTheDocument();
  expect(
    screen.getByLabelText('IMDb rating: 7.8 out of 10 from 100 votes')
  ).toBeInTheDocument();
});

test('does not fabricate a badge for zero or unavailable source data', () => {
  render(
    <RatingsDisplay
      tmdb={{ status: 'available', score: 0, voteCount: null }}
      imdb={{ status: 'unavailable', reason: 'timeout' }}
    />
  );

  expect(screen.queryByLabelText(/^TMDB rating:/)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/^IMDb rating:/)).not.toBeInTheDocument();
});

test('silently renders TMDB only when IMDb is missing', () => {
  render(
    <DetailsRatings
      value={{
        tmdb: { status: 'available', score: 8.6, voteCount: null },
        imdb: { status: 'missing' },
      }}
    />
  );

  expect(
    screen.getByLabelText('TMDB rating: 8.6 out of 10')
  ).toBeInTheDocument();
  expect(
    screen.queryByText(/ratings are unavailable/i)
  ).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Retry ratings' })).toBeNull();
});

test('renders TMDB and IMDb ratings when both are available', () => {
  render(
    <DetailsRatings
      value={{
        tmdb: { status: 'available', score: 8.6, voteCount: null },
        imdb: { status: 'available', score: 8.1, voteCount: null },
      }}
    />
  );

  expect(
    screen.getByLabelText('TMDB rating: 8.6 out of 10')
  ).toBeInTheDocument();
  expect(
    screen.getByLabelText('IMDb rating: 8.1 out of 10')
  ).toBeInTheDocument();
});

test('keeps valid ratings and silently omits unavailable optional sources', () => {
  render(
    <DetailsRatings
      value={{
        tmdb: { status: 'available', score: 7.5, voteCount: 200 },
        imdb: { status: 'unavailable', reason: 'timeout' },
      }}
    />
  );

  expect(
    screen.getByLabelText('TMDB rating: 7.5 out of 10 from 200 votes')
  ).toBeInTheDocument();
  expect(screen.queryByLabelText(/^IMDb rating:/)).not.toBeInTheDocument();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
