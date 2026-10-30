import { Test } from '@nestjs/testing';
import { BadGatewayException, GatewayTimeoutException } from '@nestjs/common';

import { SERIES_PROVIDER, SeriesProvider } from './series-provider';
import { SeriesService } from './series.service';
import { minimalSeriesDetails } from '../../test/fixtures/series';

describe('SeriesService', () => {
  const provider: jest.Mocked<Required<SeriesProvider>> = {
    findPopular: jest.fn(),
    findOne: jest.fn(),
    findRatings: jest.fn(),
    findCredits: jest.fn(),
    findImages: jest.fn(),
    findVideos: jest.fn(),
    findSeason: jest.fn(),
    findEpisode: jest.fn(),
    findEpisodeCredits: jest.fn(),
    findWatchProviders: jest.fn(),
  };
  let service: SeriesService;

  beforeEach(async () => {
    provider.findOne.mockReset();
    const module = await Test.createTestingModule({
      providers: [
        SeriesService,
        { provide: SERIES_PROVIDER, useValue: provider },
      ],
    }).compile();
    service = module.get(SeriesService);
  });

  it('delegates details to the independent Series provider', async () => {
    provider.findOne.mockResolvedValue(minimalSeriesDetails);
    await expect(service.findOne(1399)).resolves.toBe(minimalSeriesDetails);
    expect(provider.findOne).toHaveBeenCalledWith(1399);
  });

  it('preserves missing results', async () => {
    provider.findOne.mockResolvedValue(undefined);
    await expect(service.findOne(1)).resolves.toBeUndefined();
  });

  it('preserves provider failures', async () => {
    const error = new Error('provider failure');
    provider.findOne.mockRejectedValue(error);
    await expect(service.findOne(1)).rejects.toBe(error);
  });

  it.each([
    [new GatewayTimeoutException(), 'timeout'],
    [
      new BadGatewayException('Movie provider response was invalid'),
      'invalid-response',
    ],
    [new BadGatewayException('provider failure'), 'upstream-error'],
    [new Error('provider failure'), 'upstream-error'],
    [{ unexpected: true }, 'upstream-error'],
  ] as const)(
    'classifies a rating provider failure as %s',
    async (error, reason) => {
      provider.findRatings?.mockRejectedValue(error);

      await expect(service.findRatings(1)).resolves.toEqual({
        tmdb: { status: 'unavailable', reason },
        imdb: { status: 'unavailable', reason: 'not-configured' },
      });
    },
  );

  it('preserves available, unavailable, missing and missing-resource rating outcomes', async () => {
    provider.findRatings?.mockResolvedValueOnce({
      status: 'available',
      score: 8,
      voteCount: 10,
    });
    await expect(service.findRatings(1)).resolves.toMatchObject({
      tmdb: { status: 'available', score: 8 },
    });

    provider.findRatings?.mockResolvedValueOnce({
      status: 'unavailable',
      reason: 'upstream-error',
    });
    await expect(service.findRatings(1)).resolves.toMatchObject({
      tmdb: { status: 'unavailable', reason: 'upstream-error' },
    });

    provider.findRatings?.mockResolvedValueOnce({ status: 'missing' });
    await expect(service.findRatings(1)).resolves.toMatchObject({
      tmdb: { status: 'missing' },
    });

    provider.findRatings?.mockResolvedValueOnce(undefined);
    await expect(service.findRatings(1)).resolves.toBeUndefined();
  });
});
