import { BadGatewayException } from '@nestjs/common';
import { TmdbMovieProvider } from './tmdb-movie.provider';

const config = {
  accessToken: 'test-token',
  apiBaseUrl: 'https://api.themoviedb.org/3',
  imageBaseUrl: 'https://image.tmdb.org/t/p/w500',
  language: 'fr-FR',
};
const person = { id: 1, name: 'Person', movie_credits: { cast: [], crew: [] } };

describe('TmdbMovieProvider person integration', () => {
  const fetchMock = jest.fn();
  const originalFetch = global.fetch;
  const provider = new TmdbMovieProvider(config);
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });
  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('fetches acting and crew credits in one localized request without other lookups', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        ...person,
        profile_path: '/primary.jpg',
        images: { profiles: [{ file_path: '/second.jpg' }] },
        movie_credits: {
          cast: [{ id: 2, title: 'Movie', character: 'Hero' }],
          crew: [
            { id: 2, title: 'Movie', department: 'Directing', job: 'Director' },
          ],
        },
      }),
    );
    await expect(provider.findPerson(1)).resolves.toMatchObject({
      id: 1,
      name: 'Person',
      profilePhotos: [
        expect.objectContaining({
          fullUrl: 'https://image.tmdb.org/t/p/original/primary.jpg',
        }),
        expect.objectContaining({
          fullUrl: 'https://image.tmdb.org/t/p/original/second.jpg',
        }),
      ],
      filmography: [
        {
          id: 2,
          actingCredits: ['Hero'],
          crewCredits: [{ department: 'Directing', job: 'Director' }],
        },
      ],
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/3/person/1',
        search: '?language=fr-FR&append_to_response=movie_credits%2Cimages',
      }),
      expect.objectContaining({
        headers: {
          accept: 'application/json',
          Authorization: 'Bearer test-token',
        },
      }),
    );
  });

  it('accepts empty filmography and unavailable optional metadata', async () => {
    fetchMock.mockResolvedValue(Response.json(person));
    await expect(provider.findPerson(1)).resolves.toEqual({
      id: 1,
      name: 'Person',
      filmography: [],
      filmographyAvailability: { status: 'available' },
    });
  });

  it.each([
    null,
    {},
    { success: false, status_code: 9 },
    { profiles: 'invalid' },
  ])(
    'retains the primary profile when appended images fail: %j',
    async (images) => {
      fetchMock.mockResolvedValue(
        Response.json({ ...person, profile_path: '/primary.jpg', images }),
      );
      await expect(provider.findPerson(1)).resolves.toMatchObject({
        name: 'Person',
        filmographyAvailability: { status: 'available' },
        profilePhotos: [
          expect.objectContaining({
            fullUrl: 'https://image.tmdb.org/t/p/original/primary.jpg',
          }),
        ],
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    null,
    {},
    { ...person, id: 0 },
    { ...person, id: 2 },
    { ...person, name: ' ' },
  ])('rejects invalid or incomplete responses: %j', async (payload) => {
    fetchMock.mockResolvedValue(Response.json(payload));
    await expect(provider.findPerson(1)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it.each([
    { ...person, movie_credits: undefined },
    { ...person, movie_credits: null },
    { ...person, movie_credits: { cast: [] } },
    { ...person, movie_credits: { cast: {}, crew: [] } },
    { ...person, movie_credits: { cast: [], crew: [], success: false } },
  ])(
    'retains profile when optional credits are malformed: %j',
    async (payload) => {
      fetchMock.mockResolvedValue(Response.json(payload));
      await expect(provider.findPerson(1)).resolves.toMatchObject({
        id: 1,
        name: 'Person',
        filmography: [],
        filmographyAvailability: { status: 'unavailable' },
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it('returns undefined for upstream 404', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 404 }));
    await expect(provider.findPerson(1)).resolves.toBeUndefined();
  });

  it.each(['network', 'http', 'json'])(
    'sanitizes %s failures',
    async (failure) => {
      if (failure === 'network')
        fetchMock.mockRejectedValue(new Error('secret upstream details'));
      else
        fetchMock.mockResolvedValue(
          new Response('secret upstream details', {
            status: failure === 'http' ? 500 : 200,
          }),
        );
      await expect(provider.findPerson(1)).rejects.toMatchObject({
        status: 502,
      });
      await expect(provider.findPerson(1)).rejects.not.toThrow('secret');
    },
  );
});
