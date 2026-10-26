import { fireEvent, render, screen } from '@testing-library/react';
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

test('uses unified ratings after load and offers a targeted retry on request failure', () => {
  const retry = vi.fn();
  const { rerender } = render(
    <DetailsRatings tmdb={8.6} error retry={retry} />
  );
  expect(
    screen.getByLabelText('TMDB rating: 8.6 out of 10')
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Retry ratings' }));
  expect(retry).toHaveBeenCalledTimes(1);
  rerender(
    <DetailsRatings
      tmdb={8.6}
      value={{
        tmdb: { status: 'available', score: 7.5, voteCount: 200 },
        imdb: { status: 'available', score: 8.1, voteCount: null },
      }}
    />
  );
  expect(
    screen.getByLabelText('TMDB rating: 7.5 out of 10 from 200 votes')
  ).toBeInTheDocument();
  expect(
    screen.getByLabelText('IMDb rating: 8.1 out of 10')
  ).toBeInTheDocument();
});
