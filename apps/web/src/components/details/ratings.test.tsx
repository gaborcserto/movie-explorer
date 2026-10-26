import { act, render, screen, waitFor } from '@testing-library/react';

import DetailsRatings, { RatingsDisplay } from './ratings';
import { getImdbRating } from '../../util/apiUtils';

vi.mock('../../util/apiUtils', () => ({ getImdbRating: vi.fn() }));
const getRating = vi.mocked(getImdbRating);

beforeEach(() => {
  getRating.mockReset();
});

test('formats both scores to one decimal with accessible source labels and scores', () => {
  render(<RatingsDisplay tmdb={8} imdb={{ score: 7.85, voteCount: 100 }} />);
  expect(screen.getByLabelText('TMDB rating: 8.0 out of 10')).toHaveTextContent(
    '8.0'
  );
  expect(
    screen.getByLabelText('IMDb rating: 7.8 out of 10 from 100 votes')
  ).toHaveTextContent('7.8');
  expect(screen.getByLabelText('TMDB rating: 8.0 out of 10')).toHaveAttribute(
    'role',
    'img'
  );
  expect(
    screen.getByLabelText('IMDb rating: 7.8 out of 10 from 100 votes')
  ).toHaveAttribute('role', 'img');
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
});

test('hides unavailable zero scores', () => {
  render(<RatingsDisplay tmdb={0} imdb={{ score: 0, voteCount: null }} />);
  expect(screen.queryByText('0.0')).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/^TMDB rating:/)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/^IMDb rating:/)).not.toBeInTheDocument();
});

test.each(['movie', 'series'] as const)(
  '%s loads IMDb independently while TMDB stays visible',
  async (kind) => {
    let finish:
      | ((value: { imdb: { score: number; voteCount: null } }) => void)
      | undefined;
    getRating.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    render(<DetailsRatings kind={kind} id={1} tmdb={8.6} />);
    expect(
      screen.getByLabelText('TMDB rating: 8.6 out of 10')
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/^IMDb rating:/)).not.toBeInTheDocument();
    await waitFor(() =>
      expect(getRating).toHaveBeenCalledWith(kind, 1, expect.any(AbortSignal))
    );
    await act(async () => {
      finish?.({ imdb: { score: 7.8, voteCount: null } });
    });
    expect(
      screen.getByLabelText('IMDb rating: 7.8 out of 10')
    ).toBeInTheDocument();
  }
);

test.each(['missing', 'error'])(
  'keeps only TMDB for %s IMDb data',
  async (mode) => {
    if (mode === 'missing') {
      getRating.mockResolvedValue({ imdb: null });
    } else {
      getRating.mockRejectedValue(new Error('offline'));
    }

    render(<DetailsRatings kind="movie" id={1} tmdb={8.6} />);
    await waitFor(() => expect(getRating).toHaveBeenCalledTimes(1));

    expect(
      screen.getByLabelText('TMDB rating: 8.6 out of 10')
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/^IMDb rating:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/N\/A|0\.0/)).not.toBeInTheDocument();
  }
);

test('hides old ratings immediately, cancels obsolete requests, and ignores late results', async () => {
  getRating.mockResolvedValueOnce({ imdb: { score: 7.8, voteCount: null } });
  let obsolete:
    ((value: { imdb: { score: number; voteCount: null } }) => void) | undefined;
  getRating.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        obsolete = resolve;
      })
  );
  const { rerender } = render(<DetailsRatings kind="movie" id={1} tmdb={8} />);
  await screen.findByLabelText(/^IMDb rating:/);
  rerender(<DetailsRatings kind="movie" id={2} tmdb={6} />);
  expect(screen.queryByLabelText(/^IMDb rating:/)).not.toBeInTheDocument();
  await waitFor(() => expect(getRating).toHaveBeenCalledTimes(2));
  const obsoleteSignal = getRating.mock.calls[1][2];
  getRating.mockResolvedValue({ imdb: null });
  rerender(<DetailsRatings kind="series" id={3} tmdb={9} />);
  expect(obsoleteSignal.aborted).toBe(true);
  await act(async () => {
    obsolete?.({ imdb: { score: 5, voteCount: null } });
  });
  expect(screen.queryByLabelText(/^IMDb rating:/)).not.toBeInTheDocument();
  expect(
    screen.getByLabelText('TMDB rating: 9.0 out of 10')
  ).toBeInTheDocument();
  rerender(<DetailsRatings kind="series" id={3} tmdb={9.1} />);
  expect(getRating).toHaveBeenCalledTimes(3);
});
