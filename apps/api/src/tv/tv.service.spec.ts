import { Test } from '@nestjs/testing';

import { TV_PROVIDER, TvProvider } from './tv-provider';
import { TvService } from './tv.service';
import { minimalTvDetails } from '../../test/fixtures/tv';

describe('TvService', () => {
  const provider: jest.Mocked<TvProvider> = { findOne: jest.fn() };
  let service: TvService;

  beforeEach(async () => {
    provider.findOne.mockReset();
    const module = await Test.createTestingModule({
      providers: [TvService, { provide: TV_PROVIDER, useValue: provider }],
    }).compile();
    service = module.get(TvService);
  });

  it('delegates details to the independent TV provider', async () => {
    provider.findOne.mockResolvedValue(minimalTvDetails);
    await expect(service.findOne(1399)).resolves.toBe(minimalTvDetails);
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
