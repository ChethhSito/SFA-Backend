import { reconcile } from './bank-reconciliation.service';

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
