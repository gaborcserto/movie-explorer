import { BadGatewayException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PersonsController } from './persons.controller';
import { PersonsService } from './persons.service';

describe('PersonsController', () => {
  const service = { findOne: jest.fn() };
  let controller: PersonsController;

  beforeEach(async () => {
    service.findOne.mockReset();

    const module = await Test.createTestingModule({
      controllers: [PersonsController],
      providers: [{ provide: PersonsService, useValue: service }],
    }).compile();
    controller = module.get(PersonsController);
  });

  it('returns the person from the service', async () => {
    const person = { id: 1, name: 'Person', filmography: [] };
    service.findOne.mockResolvedValue(person);

    await expect(controller.getPerson({ id: 1 })).resolves.toBe(person);

    expect(service.findOne).toHaveBeenCalledWith(1);
  });

  it('returns 404 for a missing person', async () => {
    service.findOne.mockResolvedValue(undefined);

    await expect(controller.getPerson({ id: 1 })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('preserves upstream failure status', async () => {
    service.findOne.mockRejectedValue(
      new BadGatewayException('Person provider request failed'),
    );

    await expect(controller.getPerson({ id: 1 })).rejects.toMatchObject({
      status: 502,
    });
  });
});
