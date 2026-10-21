import { NotFoundException } from '@nestjs/common';

import { SeriesController } from './series.controller';
import { SeriesService } from './series.service';
import { minimalSeriesDetails } from '../../test/fixtures/series';

describe('SeriesController', () => {
  const provider = {
    findPopular: jest.fn(),
    findOne: jest.fn(),
    findCredits: jest.fn(),
    findImages: jest.fn(),
    findVideos: jest.fn(),
    findSeason: jest.fn(),
    findEpisode: jest.fn(),
    findEpisodeCredits: jest.fn(),
  };
  const controller = new SeriesController(new SeriesService(provider));

  beforeEach(() => provider.findOne.mockReset());

  it('returns normalized details', async () => {
    provider.findOne.mockResolvedValue(minimalSeriesDetails);
    await expect(controller.getSeries({ id: 1399 })).resolves.toEqual(
      minimalSeriesDetails,
    );
    expect(provider.findOne).toHaveBeenCalledWith(1399);
  });

  it('translates missing series to resource-specific 404', async () => {
    provider.findOne.mockResolvedValue(undefined);
    await expect(controller.getSeries({ id: 1 })).rejects.toThrow(
      new NotFoundException('TV series not found'),
    );
  });
});
