import { BadRequestException } from '@nestjs/common';
import { GraduationsService } from './graduations.service';

describe('Graduation documentary review', () => {
  const query = (value: unknown) => ({ exec: async () => value });
  it('does not accept an apto review when a prerequisite is missing', async () => {
    const model = { findOne: () => query({ docsChecked: { solicitud: true, constanciaEgresado: false, practicasPre: true, pagoDerecho: true } }), findOneAndUpdate: jest.fn() };
    const service = new GraduationsService(model as never);
    await expect(service.update('12345678', { status: 'Apto' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create({ status: 'Apto', docsChecked: {} })).rejects.toBeInstanceOf(BadRequestException);
    expect(model.findOneAndUpdate).not.toHaveBeenCalled();
  });
  it('uses saved requirements before recording an apto review', async () => {
    const model = { findOne: () => query({ docsChecked: { solicitud: true, constanciaEgresado: true, practicasPre: true, pagoDerecho: true } }),
      findOneAndUpdate: jest.fn(() => query({ status: 'Apto' })) };
    expect(await new GraduationsService(model as never).update('12345678', { status: 'Apto' })).toEqual({ status: 'Apto' });
  });
});
