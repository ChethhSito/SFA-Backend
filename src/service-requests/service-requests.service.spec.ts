import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ServiceRequestsService } from './service-requests.service';

describe('ServiceRequestsService', () => {
  const student = { dni: '88881001', name: 'Prueba', lastName: 'Estudiante', active: true };
  const students = { findOne: jest.fn(() => ({ lean: async () => student })) };
  const requests = {
    create: jest.fn(async (record) => record),
    findOne: jest.fn(() => ({ lean: async () => ({ studentDni: student.dni, status: 'Pendiente' }) })),
    findOneAndUpdate: jest.fn(() => ({ lean: async () => ({ id: 'SOL-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' }) })),
  };
  const service = new ServiceRequestsService(requests as never, students as never);

  beforeEach(() => jest.clearAllMocks());

  it('creates a student procedure using the registered student and official rate', async () => {
    const created = await service.create({ studentDni: student.dni, conceptCode: 'CER01', source: 'estudiante', reason: 'Beca' });
    expect(created).toMatchObject({ studentDni: student.dni, studentName: 'Prueba Estudiante', conceptCode: 'CER01', amount: 50, status: 'Pendiente' });
    expect(requests.create).toHaveBeenCalledTimes(1);
  });

  it('requires an existing student and forbids admission charges from the student portal', async () => {
    students.findOne.mockReturnValueOnce({ lean: async () => null } as never);
    await expect(service.create({ studentDni: student.dni, conceptCode: 'CER01', source: 'estudiante' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.create({ studentDni: student.dni, conceptCode: 'ADM01', source: 'estudiante' })).rejects.toBeInstanceOf(BadRequestException);
    expect(requests.create).not.toHaveBeenCalled();
  });

  it('allows a guardian call for an existing student with a recorded caller', async () => {
    const created = await service.create({ studentDni: student.dni, conceptCode: 'CON01', source: 'llamada_apoderado', requestedBy: 'Apoderado Demo' });
    expect(created).toMatchObject({ conceptCode: 'CON01', amount: 30, requestedBy: 'Apoderado Demo', source: 'llamada_apoderado' });
    await expect(service.create({ studentDni: student.dni, conceptCode: 'CON01', source: 'llamada_apoderado' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts a student voucher as En Proceso without validating the payment', async () => {
    const id = 'SOL-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    await service.submitVoucher(id, { studentDni: student.dni, operationNumber: 'BN-20261020-01', paymentDate: '2026-10-20', amountPaid: 50 });
    expect(requests.findOneAndUpdate).toHaveBeenCalledWith(
      { id, studentDni: student.dni, status: { $in: ['Pendiente', 'Observado'] } },
      expect.objectContaining({ status: 'En Proceso', paymentOperation: 'BN-20261020-01', bankName: 'Banco de la Nación' }),
      { new: true },
    );
  });

  it('rejects a voucher for another student or an already reviewed request', async () => {
    const id = 'SOL-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    requests.findOne.mockReturnValueOnce({ lean: async () => null } as never);
    await expect(service.submitVoucher(id, { studentDni: '99999999', operationNumber: 'BN-1', paymentDate: '2026-10-20', amountPaid: 50 })).rejects.toBeInstanceOf(NotFoundException);
    requests.findOne.mockReturnValueOnce({ lean: async () => ({ studentDni: student.dni, status: 'Validado' }) } as never);
    await expect(service.submitVoucher(id, { studentDni: student.dni, operationNumber: 'BN-1', paymentDate: '2026-10-20', amountPaid: 50 })).rejects.toThrow('ya está en revisión');
  });
});
