import * as fs from 'fs';
import { NotFoundException } from '@nestjs/common';
import { Movie } from './movies.dto';
import { MoviesService } from './movies.service';

jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

const movies: Movie[] = [
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
      data: movies,
      totalAmount: 3,
      offset: 0,
      limit: 10,
    });
  });

  it('filters by title search, genre, sorting, and pagination', () => {
    expect(
      service.findAll({
        search: 'a',
        searchBy: 'title',
        filter: ['Drama'],
        sortBy: 'vote_average',
        sortOrder: 'desc',
        offset: 0,
        limit: 1,
      }),
    ).toEqual({
      data: [movies[2]],
      totalAmount: 2,
      offset: 0,
      limit: 1,
    });
  });

  it('finds one movie by id', () => {
    expect(service.findOne(2)).toEqual(movies[1]);
  });

  it('creates a valid movie and persists it', async () => {
    const newMovie: Movie = {
      title: 'Delta',
      release_date: '2023-01-01',
      poster_path: 'https://example.com/delta.jpg',
      overview: 'Delta overview',
      runtime: 130,
      genres: ['Adventure'],
    };

    await service.create(newMovie);

    expect(service.findAll({}).totalAmount).toBe(4);
    expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid movie data on create', async () => {
    await expect(
      service.create({
        title: 'Invalid',
        release_date: '2023-01-01',
        poster_path: 'not-a-url',
        overview: 'Invalid overview',
        runtime: 90,
        genres: ['Drama'],
      }),
    ).rejects.toThrow('Validation failed!');

    expect(mockedFs.writeFileSync).not.toHaveBeenCalled();
  });

  it('updates an existing movie and persists it', async () => {
    await expect(
      service.update(1, { title: 'Updated Alpha' } as Movie),
    ).resolves.toMatchObject({
      id: 1,
      title: 'Updated Alpha',
      genres: ['Drama', 'Comedy'],
    });

    expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(1);
  });

  it('throws when updating a missing movie', () => {
    expect(() => service.update(999, movies[0])).toThrow(NotFoundException);

    expect(mockedFs.writeFileSync).not.toHaveBeenCalled();
  });

  it('deletes an existing movie and persists it', () => {
    expect(service.delete(2)).toEqual(movies[1]);
    expect(service.findOne(2)).toBeUndefined();
    expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(1);
  });

  it('returns null when deleting a missing movie', () => {
    expect(service.delete(999)).toBeNull();
    expect(mockedFs.writeFileSync).not.toHaveBeenCalled();
  });
});
