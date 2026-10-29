import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { EpisodeSummary } from '@movie-explorer/contracts';

import EpisodeList from './episodeList';

const episodes: EpisodeSummary[] = [
  {
    id: 1,
    seriesId: 10,
    seasonNumber: 1,
    episodeNumber: 1,
    title: 'A long beginning',
    description: 'The story starts.\nThen the journey begins.',
    airDate: '2021-04-01',
    runtimeMinutes: 43,
    stillUrl: null,
    rating: 8.2,
    voteCount: 120,
  },
  {
    id: 2,
    seriesId: 10,
    seasonNumber: 1,
    episodeNumber: 2,
    title: 'Unrated episode',
    description: null,
    airDate: null,
    runtimeMinutes: null,
    stillUrl: null,
    rating: 0,
    voteCount: 0,
  },
];

test('keeps episode metadata compact and hides unavailable metadata and ratings', () => {
  render(
    <MemoryRouter>
      <EpisodeList seriesId={10} seasonNumber={1} episodes={episodes} />
    </MemoryRouter>
  );

  const ratedEpisode = screen.getByRole('link', {
    name: '1. A long beginning',
  });
  const metadata = ratedEpisode.querySelector('.series-episode-metadata');

  expect(metadata).toHaveTextContent('Air date2021-04-01');
  expect(metadata).toHaveTextContent('Runtime43 min');
  const description = ratedEpisode.querySelector('.series-excerpt');

  expect(description).toHaveTextContent('The story starts.');
  expect(description).toHaveTextContent('Then the journey begins.');
  expect(
    within(ratedEpisode).getByRole('img', {
      name: 'TMDB rating: 8.2 out of 10 from 120 votes',
    })
  ).toBeVisible();

  const unratedEpisode = screen.getByRole('link', {
    name: '2. Unrated episode',
  });

  expect(
    unratedEpisode.querySelector('.series-episode-metadata')
  ).not.toBeInTheDocument();
  expect(
    unratedEpisode.querySelector('.series-episode-rating')
  ).not.toBeInTheDocument();
});
