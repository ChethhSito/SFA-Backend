import { BankReconciliationService, reconcile } from './bank-reconciliation.service';

const row = { operation: '308496', date: '2026-04-12', conceptCode: '01849', concept: 'Constancia', dni: '54793519', payer: 'Diego', amount: 30 };
const obligation = {
  id: 'ob-1', studentDni: '54793519', conceptCode: 'CON01', finalAmount: 30,
  status: 'En Proceso', voucherRegistered: true,
  voucherDetails: { operationNumber: 'OP-308496', paymentDate: '2026-04-12', amountPaid: 30 },
};

describe('conciliación bancaria', () => {
  it('valida solo coincidencia completa', () => {
    expect(reconcile({ fileName: 'demo.xlsx', rows: [row], obligations: [obligation] })[0]).toMatchObject({ status: 'coincide', obligationId: 'ob-1' });
  });

  it('detecta diferencias de DNI, monto y fecha', () => {
    const changed = { ...row, dni: '12345678', amount: 31, date: '2026-04-13' };
    expect(reconcile({ fileName: 'demo.xlsx', rows: [changed], obligations: [obligation] })[0]).toMatchObject({ status: 'diferencia', detail: 'No coincide: DNI, monto, fecha.' });
  });

  it('retiene duplicados y tasas sin mapeo', () => {
    const results = reconcile({ fileName: 'demo.xlsx', rows: [row, row, { ...row, operation: '999999', conceptCode: '01847' }], obligations: [obligation] });
    expect(results.map(r => r.status)).toEqual(['duplicado', 'duplicado', 'sin_mapeo']);
  });

  it('no revalida una obligación ya validada', () => {
    expect(reconcile({ fileName: 'demo.xlsx', rows: [row], obligations: [{ ...obligation, status: 'Validado' }] })[0].status).toBe('ya_validado');
  });
});

describe('conciliación contra MongoDB', () => {
  const source = { ...obligation, id: 'SOL-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' };
  const request = { id: source.id, studentDni: source.studentDni, conceptCode: source.conceptCode,
    amount: 30, amountPaid: 30, status: 'En Proceso', paymentOperation: 'OP-308496', paymentDate: row.date };
  const requests = { findOne: jest.fn(() => ({ lean: async () => request })), updateOne: jest.fn(async () => ({})) };
  const payments = { find: jest.fn(() => ({ lean: async () => [] })), findOne: jest.fn(() => ({ lean: async () => null })), updateOne: jest.fn(async () => ({})) };
  const imports = { findOne: jest.fn(() => ({ lean: async () => null })), create: jest.fn(async () => ({})) };
  const service = new BankReconciliationService(imports as never, payments as never, {} as never, {} as never, requests as never);

  it('no acepta un voucher inventado solo en el navegador', async () => {
    requests.findOne.mockReturnValueOnce({ lean: async () => null } as never);
    const preview = await service.preview({ fileName: 'demo.xlsx', rows: [row], obligations: [source] });
    expect(preview.matches).toBe(0);
    expect(preview.results[0].status).toBe('fuente_no_verificada');
  });

  it('permite la coincidencia cuando la solicitud y el voucher existen en MongoDB', async () => {
    const preview = await service.preview({ fileName: 'demo.xlsx', rows: [row], obligations: [source] });
    expect(preview.matches).toBe(1);
    expect(preview.results[0].obligationId).toBe(source.id);
  });

  it('confirma el Excel y actualiza la solicitud en MongoDB', async () => {
    const input = { fileName: 'demo.xlsx', rows: [row], obligations: [source] };
    const preview = await service.preview(input);
    const result = await service.confirm({ ...input, expectedFingerprint: preview.fingerprint, expectedObligationIds: [source.id] });
    expect(result.validatedObligationIds).toEqual([source.id]);
    expect(payments.updateOne).toHaveBeenCalled();
    expect(requests.updateOne).toHaveBeenCalledWith({ id: source.id, status: 'En Proceso' }, { $set: { status: 'Validado' } });
  });
});
