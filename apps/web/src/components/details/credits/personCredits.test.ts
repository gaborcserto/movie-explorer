import type { MovieDetails } from '@movie-explorer/contracts';

import { getMoviePersonCredits } from './personCredits';

const movie: MovieDetails = {
  id: 1,
  title: 'Movie',
  posterUrl: '',
  genres: [],
  cast: [],
};

test('merges repeated crew IDs and unlinked crew names while preserving first-seen order', () => {
  const credits = getMoviePersonCredits({
    ...movie,
    writers: [
      { id: 2, name: ' Writer ', roles: [' Story ', 'Screenplay'] },
      {
        id: 2,
        name: 'Renamed Writer',
        profileUrl: '/writer.jpg',
        roles: ['Story', 'Consultant'],
      },
      { name: 'Unlinked Writer', roles: ['Writer'] },
      { name: ' Unlinked Writer ', roles: ['Story'] },
    ],
  });

  expect(credits.writers).toEqual([
    {
      id: 2,
      name: 'Writer',
      roles: ['Story', 'Screenplay', 'Consultant'],
      profileUrl: '/writer.jpg',
      key: 'person-2',
      profileSrcSet: undefined,
    },
    {
      name: 'Unlinked Writer',
      roles: ['Writer', 'Story'],
      key: 'writer-2',
      profileUrl: undefined,
      profileSrcSet: undefined,
    },
  ]);
});

test('reconciles matching legacy cast occurrences without merging names or inventing IDs', () => {
  const credits = getMoviePersonCredits({
    ...movie,
    cast: ['Actor', 'Actor', 'Legacy Only', ' '],
    castMembers: [
      { id: 10, name: ' Actor ', character: 'Hero' },
      { id: 10, name: 'Actor', character: 'Villain' },
      { name: 'Same Name' },
      { name: 'Same Name' },
      { name: ' ' },
    ],
  });

  expect(credits.cast.map(({ name }) => name)).toEqual([
    'Actor',
    'Same Name',
    'Same Name',
    'Legacy Only',
  ]);
  expect(credits.cast.map(({ key }) => key)).toEqual([
    'person-10',
    'cast-2',
    'cast-3',
    'cast-4',
  ]);
  expect(credits.cast[0].roles).toEqual(['Hero', 'Villain']);
  expect(credits.cast.slice(1).map(({ roles }) => roles)).toEqual([[], [], []]);
});
