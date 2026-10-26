import { BadGatewayException } from '@nestjs/common';
import type { MovieProvider } from '../movies/movie-provider';
import { PersonsService } from './persons.service';

describe('PersonsService', () => {
  const provider: jest.Mocked<MovieProvider> = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findSuggestions: jest.fn(),
    findPerson: jest.fn(),
    findPeople: jest.fn(),
    findMovieSection: jest.fn(),
    findFilmography: jest.fn(),
    findWatchProviders: jest.fn(),
  };
  const service = new PersonsService(provider, {
    findPerson: jest.fn(),
    findCombined: jest.fn(),
  });

  it('delegates person lookup to the configured provider', async () => {
    const person = { id: 1, name: 'Person', filmography: [] };
    provider.findPerson.mockResolvedValueOnce(person);

    await expect(service.findOne(1)).resolves.toBe(person);

    expect(provider.findPerson).toHaveBeenCalledWith(1);
  });

  it('preserves missing persons and provider failures', async () => {
    provider.findPerson.mockResolvedValueOnce(undefined);
    await expect(service.findOne(2)).resolves.toBeUndefined();

    const error = new BadGatewayException('Person provider request failed');
    provider.findPerson.mockRejectedValueOnce(error);
    await expect(service.findOne(2)).rejects.toBe(error);
  });
});
