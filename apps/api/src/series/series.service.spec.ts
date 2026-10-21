import { Test } from '@nestjs/testing';

import { SERIES_PROVIDER, SeriesProvider } from './series-provider';
import { SeriesService } from './series.service';
import { minimalSeriesDetails } from '../../test/fixtures/series';

describe('SeriesService', () => {
  const provider: jest.Mocked<SeriesProvider> = {
    findPopular: jest.fn(),
    findOne: jest.fn(),
    findCredits: jest.fn(),
    findImages: jest.fn(),
    findVideos: jest.fn(),
    findSeason: jest.fn(),
    findEpisode: jest.fn(),
    findEpisodeCredits: jest.fn(),
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
});
