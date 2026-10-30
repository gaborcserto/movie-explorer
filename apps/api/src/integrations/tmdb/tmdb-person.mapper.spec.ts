import { ok } from 'node:assert/strict';
import { TmdbPersonMapper } from './tmdb-person.mapper';
import type { TmdbPersonDetails } from './tmdb.types';

const mapper = new TmdbPersonMapper('https://image.tmdb.org/t/p/w500');
const person: TmdbPersonDetails = {
  id: 10,
  name: ' Person ',
  movie_credits: { cast: [], crew: [] },
};

describe('TmdbPersonMapper', () => {
  it('maps primary-first profiles with stable path deduplication and skips malformed entries', () => {
    const result = mapper.toPersonDetails({
      ...person,
      profile_path: '/primary.jpg',
      images: {
        profiles: [
          { file_path: '/second.jpg' },
          { file_path: '/primary.jpg' },
          { file_path: ' /second.jpg ' },
          null,
          {},
          { file_path: 42 },
          { file_path: '//invalid.jpg' },
          { file_path: ' ' },
          { file_path: '/tall.jpg' },
        ],
      },
    });
    expect(result.profilePhotos).toEqual(
      ['primary', 'second', 'tall'].map((name) => ({
        thumbnailUrl: `https://image.tmdb.org/t/p/w500/${name}.jpg`,
        fullUrl: `https://image.tmdb.org/t/p/original/${name}.jpg`,
        alt: 'Portrait of Person',
      })),
    );
  });

  it.each([
    undefined,
    null,
    {},
    { profiles: null },
    { profiles: 'invalid' },
    { success: false, profiles: [{ file_path: '/ignored.jpg' }] },
  ])(
    'recovers from missing or failed optional image metadata: %j',
    (images) => {
      const result = mapper.toPersonDetails({
        ...person,
        profile_path: '/primary.jpg',
        images,
      });
      expect(result.profilePhotos).toHaveLength(1);
      ok(result.profilePhotos);
      expect(result.profilePhotos[0].fullUrl).toContain(
        '/original/primary.jpg',
      );
      expect(result.name).toBe('Person');
    },
  );

  it('allows absent primary and empty profiles without inventing a photo', () => {
    expect(
      mapper.toPersonDetails({ ...person, images: { profiles: [] } })
        .profilePhotos,
    ).toBeUndefined();
  });
  it('merges movie identities, distinct characters, and distinct department/job pairs in credit order', () => {
    const movie = {
      id: 2,
      title: ' Upcoming ',
      release_date: '2099-01-02',
      poster_path: '/movie.jpg',
    };
    const input = {
      ...person,
      movie_credits: {
        cast: [
          { ...movie, character: ' Hero ' },
          { ...movie, character: 'Hero' },
          { ...movie, character: 'Other' },
        ],
        crew: [
          ...[
            'Director',
            'Writer',
            'Screenplay',
            'Producer',
            'Executive Producer',
            'Director',
          ].map((job) => ({ ...movie, department: 'Production', job })),
          { ...movie, department: 'Writing', job: 'Writer' },
        ],
      },
    };
    const result = mapper.toPersonDetails(input);
    expect(result.filmography).toHaveLength(1);
    expect(result.filmography[0]).toMatchObject({
      id: 2,
      title: 'Upcoming',
      releaseDate: '2099-01-02',
      posterUrl: 'https://image.tmdb.org/t/p/w500/movie.jpg',
      actingCredits: ['Hero', 'Other'],
      crewCredits: [
        { department: 'Production', job: 'Director' },
        { department: 'Production', job: 'Writer' },
        { department: 'Production', job: 'Screenplay' },
        { department: 'Production', job: 'Producer' },
        { department: 'Production', job: 'Executive Producer' },
        { department: 'Writing', job: 'Writer' },
      ],
    });
    expect(result.filmography[0].posterSrcSet).toContain('/w342/movie.jpg 1x');
    expect(mapper.toPersonDetails(input)).toEqual(result);
    expect(input.movie_credits.cast).toHaveLength(3);
  });

  it('preserves unknown roles and undated movies while skipping invalid and explicitly adult records', () => {
    const valid = { id: 1, title: 'Undated' };
    const result = mapper.toPersonDetails({
      ...person,
      known_for_department: 'Directing',
      movie_credits: {
        cast: [
          null,
          {},
          { id: -1, title: 'Invalid' },
          { id: 1.2, title: 'Invalid' },
          { id: '3', title: 'Invalid' },
          { id: 4, title: ' ' },
          { id: 5, title: 'Adult', adult: true },
          valid,
        ],
        crew: [
          valid,
          valid,
          { id: 6, title: 'Crew only', department: 'Writing' },
          { id: 7, title: 'Adult crew', adult: true },
        ],
      },
    });
    expect(result.filmography).toEqual([
      {
        id: 1,
        title: 'Undated',
        posterUrl: '',
        genres: [],
        actingCredits: [],
        crewCredits: [{}],
      },
      {
        id: 6,
        title: 'Crew only',
        posterUrl: '',
        genres: [],
        crewCredits: [{ department: 'Writing' }],
      },
    ]);
  });

  it('maps optional metadata, date-only strings, and responsive portraits', () => {
    expect(
      mapper.toPersonDetails({
        ...person,
        known_for_department: 'Acting',
        birthday: '1970-01-02',
        deathday: '2020-03-04',
        place_of_birth: 'City',
        biography: ' Biography ',
        profile_path: '/person.jpg',
      }),
    ).toMatchObject({
      id: 10,
      name: 'Person',
      knownForDepartment: 'Acting',
      birthday: '1970-01-02',
      deathDate: '2020-03-04',
      placeOfBirth: 'City',
      biography: 'Biography',
      profileUrl: 'https://image.tmdb.org/t/p/w500/person.jpg',
      profileSrcSet:
        'https://image.tmdb.org/t/p/w185/person.jpg 1x, https://image.tmdb.org/t/p/h632/person.jpg 2x, https://image.tmdb.org/t/p/original/person.jpg 3x',
      filmography: [],
    });
    expect(
      mapper.toPersonDetails({
        ...person,
        biography: ' ',
        birthday: null,
        profile_path: 42,
      }),
    ).toEqual({ id: 10, name: 'Person', filmography: [] });
  });
});
