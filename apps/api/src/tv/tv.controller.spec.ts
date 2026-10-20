import { NotFoundException } from '@nestjs/common';

import { TvController } from './tv.controller';
import { TvService } from './tv.service';
import { minimalTvDetails } from '../../test/fixtures/tv';

describe('TvController', () => {
  const provider = { findOne: jest.fn() };
  const controller = new TvController(new TvService(provider));

  beforeEach(() => provider.findOne.mockReset());

  it('returns normalized details', async () => {
    provider.findOne.mockResolvedValue(minimalTvDetails);
    await expect(controller.getSeries({ id: 1399 })).resolves.toEqual(
      minimalTvDetails,
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
