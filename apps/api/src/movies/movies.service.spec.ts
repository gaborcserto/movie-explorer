import * as fs from 'fs';
import { NotFoundException } from '@nestjs/common';
import type { MovieMutationPayload } from '@movie-explorer/contracts';
import { MoviesService } from './movies.service';

jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

const movies = [
  {
    id: 1,
    title: 'Alpha',
    tagline: 'First',
    vote_average: 8,
    vote_count: 100,
    release_date: '2020-01-01',
    poster_path: 'https://example.com/alpha.jpg',
    overview: 'Alpha overview',
    budget: 1000,
    revenue: 2000,
    runtime: 100,
    genres: ['Drama', 'Comedy'],
  },
  {
    id: 2,
    title: 'Beta',
    tagline: 'Second',
    vote_average: 6,
    vote_count: 200,
    release_date: '2021-01-01',
    poster_path: 'https://example.com/beta.jpg',
    overview: 'Beta overview',
    budget: 2000,
    revenue: 3000,
    runtime: 110,
    genres: ['Action'],
  },
  {
    id: 3,
    title: 'Gamma',
    tagline: 'Third',
    vote_average: 9,
    vote_count: 300,
    release_date: '2022-01-01',
    poster_path: 'https://example.com/gamma.jpg',
    overview: 'Gamma overview',
    budget: 3000,
    revenue: 4000,
    runtime: 120,
    genres: ['Drama'],
  },
];

describe('MoviesService', () => {
  let service: MoviesService;
  const mockedFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(movies));
    mockedFs.writeFileSync.mockClear();
    service = new MoviesService();
  });

  it('returns movies with default pagination metadata', () => {
    expect(service.findAll({})).toEqual({
      movies: [
        {
          id: 1,
          title: 'Alpha',
          releaseDate: '2020-01-01',
          posterUrl: 'https://example.com/alpha.jpg',
          genres: ['Drama', 'Comedy'],
        },
        {
          id: 2,
          title: 'Beta',
          releaseDate: '2021-01-01',
          posterUrl: 'https://example.com/beta.jpg',
          genres: ['Action'],
        },
        {
          id: 3,
          title: 'Gamma',
          releaseDate: '2022-01-01',
          posterUrl: 'https://example.com/gamma.jpg',
          genres: ['Drama'],
        },
      ],
      total: 3,
      offset: 0,
      limit: 10,
    });
  });

  it('filters by title search, genre, sorting, and pagination', () => {
    expect(
      service.findAll({
        search: 'a',
        genre: ['Drama'],
        sort: 'rating',
        sortOrder: 'desc',
        offset: 0,
        limit: 1,
      }),
    ).toEqual({
      movies: [
        {
          id: 3,
          title: 'Gamma',
          releaseDate: '2022-01-01',
          posterUrl: 'https://example.com/gamma.jpg',
          genres: ['Drama'],
        },
      ],
      total: 2,
      offset: 0,
      limit: 1,
    });
  });

  it('finds one movie by id', () => {
    expect(service.findOne(2)).toEqual({
      id: 2,
      title: 'Beta',
      releaseDate: '2021-01-01',
      posterUrl: 'https://example.com/beta.jpg',
      genres: ['Action'],
      rating: 6,
      runtimeMinutes: 110,
      description: 'Beta overview',
    });
  });

  it('creates a valid movie and persists it', async () => {
    const newMovie: MovieMutationPayload = {
      title: 'Delta',
      releaseDate: '2023-01-01',
      posterUrl: 'https://example.com/delta.jpg',
      description: 'Delta overview',
      runtimeMinutes: 130,
      genres: ['Adventure'],
      rating: 7,
    };

    await service.create(newMovie);

    expect(service.findAll({}).total).toBe(4);
    expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid movie data on create', async () => {
    await expect(
      service.create({
        title: 'Invalid',
        releaseDate: '2023-01-01',
        posterUrl: 'not-a-url',
        description: 'Invalid overview',
        runtimeMinutes: 90,
        genres: ['Drama'],
        rating: 5,
      }),
    ).rejects.toThrow('Validation failed!');

    expect(mockedFs.writeFileSync).not.toHaveBeenCalled();
  });

  it('updates an existing movie and persists it', async () => {
    await expect(
      service.update(1, {
        title: 'Updated Alpha',
        releaseDate: '2020-01-01',
        posterUrl: 'https://example.com/alpha.jpg',
        description: 'Alpha overview',
        runtimeMinutes: 100,
        genres: ['Drama', 'Comedy'],
        rating: 8,
      }),
    ).resolves.toMatchObject({
      id: 1,
      title: 'Updated Alpha',
      genres: ['Drama', 'Comedy'],
    });

    expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(1);
  });

  it('throws when updating a missing movie', async () => {
    await expect(
      service.update(999, {
        title: 'Missing',
        releaseDate: '2020-01-01',
        posterUrl: 'https://example.com/missing.jpg',
        description: 'Missing overview',
        runtimeMinutes: 100,
        genres: ['Drama'],
        rating: 8,
      }),
    ).rejects.toThrow(NotFoundException);

    expect(mockedFs.writeFileSync).not.toHaveBeenCalled();
  });

  it('deletes an existing movie and persists it', () => {
    expect(service.delete(2)).toEqual({
      id: 2,
      title: 'Beta',
      releaseDate: '2021-01-01',
      posterUrl: 'https://example.com/beta.jpg',
      genres: ['Action'],
      rating: 6,
      runtimeMinutes: 110,
      description: 'Beta overview',
    });
    expect(service.findOne(2)).toBeUndefined();
    expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(1);
  });

  it('returns null when deleting a missing movie', () => {
    expect(service.delete(999)).toBeNull();
    expect(mockedFs.writeFileSync).not.toHaveBeenCalled();
  });
});
