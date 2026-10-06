import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash } from 'node:crypto';
import { Model } from 'mongoose';
import { BankImport, BankImportDocument } from './bank-import.schema';
import { Payment, PaymentDocument } from '../payments/schemas/payment.schema';

const bankConcepts: Record<string, string> = {
  '01844': 'MAT01', '01845': 'ADM01', '01846': 'CER01', '01849': 'CON01',
};

export interface BankRow {
  operation: string;
  date: string;
  conceptCode: string;
  concept: string;
  dni: string;
  payer: string;
  amount: number;
}

interface VoucherObligation {
  id: string;
  studentDni: string;
  conceptCode: string;
  finalAmount: number;
  status: string;
  voucherRegistered?: boolean;
  voucherDetails?: { operationNumber: string; paymentDate: string; amountPaid: number };
}

type Input = { fileName: string; rows: BankRow[]; obligations: VoucherObligation[] };
type Result = { row: number; operation: string; dni: string; amount: number; status: string; detail: string; obligationId?: string };

function operation(value: unknown): string {
  return String(value ?? '').trim().toUpperCase().replace(/^OP[-\s]*/, '').replace(/\s/g, '');
}

function cents(value: number): number { return Math.round(value * 100); }

function parseInput(value: unknown): Input {
  if (!value || typeof value !== 'object') throw new BadRequestException('Datos de conciliación inválidos.');
  const input = value as Input;
  if (typeof input.fileName !== 'string' || !/\.xlsx$/i.test(input.fileName) || input.fileName.length > 180)
    throw new BadRequestException('Seleccione un archivo .xlsx válido.');
  if (!Array.isArray(input.rows) || input.rows.length === 0 || input.rows.length > 5000 || !Array.isArray(input.obligations) || input.obligations.length > 20000)
    throw new BadRequestException('Cantidad de filas u obligaciones inválida.');
  input.rows.forEach((r, i) => {
    if (!r || typeof r.operation !== 'string' || !operation(r.operation) || !/^\d{4}-\d{2}-\d{2}$/.test(r.date) ||
      typeof r.conceptCode !== 'string' || !/^\d{5}$/.test(r.conceptCode) || typeof r.dni !== 'string' || !/^\d{8}$/.test(r.dni) ||
      typeof r.amount !== 'number' || !Number.isFinite(r.amount) || r.amount <= 0 || !Number.isInteger(cents(r.amount)) ||
      typeof r.concept !== 'string' || typeof r.payer !== 'string')
      throw new BadRequestException(`Fila ${i + 1} del reporte inválida.`);
  });
  input.obligations.forEach((o, i) => {
    if (!o || typeof o.id !== 'string' || typeof o.studentDni !== 'string' || typeof o.conceptCode !== 'string' ||
      typeof o.status !== 'string' || typeof o.finalAmount !== 'number' || !Number.isFinite(o.finalAmount))
      throw new BadRequestException(`Obligación ${i + 1} inválida.`);
  });
  return input;
}

export function reconcile(input: Input): Result[] {
  const counts = new Map<string, number>();
  input.rows.forEach(r => counts.set(operation(r.operation), (counts.get(operation(r.operation)) || 0) + 1));
  const vouchers = input.obligations.filter(o => o.voucherRegistered && o.voucherDetails?.operationNumber);
  return input.rows.map((r, index) => {
    const base = { row: index + 1, operation: r.operation, dni: r.dni, amount: r.amount };
    const op = operation(r.operation);
    if ((counts.get(op) || 0) > 1) return { ...base, status: 'duplicado', detail: 'Operación repetida en el Excel.' };
    const code = bankConcepts[r.conceptCode];
    if (!code) return { ...base, status: 'sin_mapeo', detail: `La tasa ${r.conceptCode} no existe en el catálogo MAF.` };
    const sameOp = vouchers.filter(o => operation(o.voucherDetails!.operationNumber) === op);
    if (!sameOp.length) return { ...base, status: 'sin_voucher', detail: 'No hay voucher MAF con esta operación.' };
    if (sameOp.length > 1) return { ...base, status: 'ambiguo', detail: 'La operación aparece en más de un voucher MAF.' };
    const o = sameOp[0];
    if (o.status === 'Validado') return { ...base, status: 'ya_validado', detail: 'La obligación ya está validada.' };
    if (o.status !== 'En Proceso') return { ...base, status: 'estado_invalido', detail: `La obligación está ${o.status}.` };
    const differences: string[] = [];
    if (o.studentDni !== r.dni) differences.push('DNI');
    if (o.conceptCode !== code) differences.push('concepto');
    if (cents(o.finalAmount) !== cents(r.amount) || cents(o.voucherDetails!.amountPaid) !== cents(r.amount)) differences.push('monto');
    if (o.voucherDetails!.paymentDate.slice(0, 10) !== r.date) differences.push('fecha');
    if (differences.length) return { ...base, status: 'diferencia', detail: `No coincide: ${differences.join(', ')}.`, obligationId: o.id };
    return { ...base, status: 'coincide', detail: 'Voucher y reporte coinciden.', obligationId: o.id };
  });
}

@Injectable()
export class BankReconciliationService {
  constructor(
    @InjectModel(BankImport.name) private readonly imports: Model<BankImportDocument>,
    @InjectModel(Payment.name) private readonly payments: Model<PaymentDocument>,
  ) {}

  private fingerprint(rows: BankRow[]): string {
    return createHash('sha256').update(JSON.stringify(rows.map(r => ({
      operation: operation(r.operation), date: r.date, conceptCode: r.conceptCode, dni: r.dni, amount: cents(r.amount),
    })))).digest('hex');
  }

  private async accountForImportedPayments(input: Input, results: Result[]): Promise<Result[]> {
    const matching = results.filter(r => r.status === 'coincide');
    if (!matching.length) return results;
    const keys = matching.map(r => `${input.rows[r.row - 1].date}:${operation(r.operation)}`);
    const existing = await this.payments.find({ bankOperationKey: { $in: keys } }).lean();
    const byKey = new Map(existing.map(p => [p.bankOperationKey, p]));
    return results.map(result => {
      if (result.status !== 'coincide') return result;
      const r = input.rows[result.row - 1];
      const payment = byKey.get(`${r.date}:${operation(r.operation)}`);
      if (!payment) return result;
      const same = payment.studentDni === r.dni && payment.mafObligationId === result.obligationId &&
        payment.concept === bankConcepts[r.conceptCode] && cents(payment.amount) === cents(r.amount);
      return { ...result, status: same ? 'ya_importado' : 'conflicto',
        detail: same ? 'La operación ya fue importada.' : 'La operación está asociada a otros datos en MongoDB.' };
    });
  }

  async preview(body: unknown) {
    const input = parseInput(body);
    const results = await this.accountForImportedPayments(input, reconcile(input));
    return { fingerprint: this.fingerprint(input.rows), total: results.length,
      matches: results.filter(r => r.status === 'coincide').length, results };
  }

  async confirm(body: unknown) {
    const input = parseInput(body);
    const fingerprint = this.fingerprint(input.rows);
    const existing = await this.imports.findOne({ fingerprint }).lean();
    if (existing) return { fingerprint, repeated: true, validatedObligationIds: existing.validatedObligationIds };
    const results = await this.accountForImportedPayments(input, reconcile(input));
    const matching = results.filter(r => r.status === 'coincide');
    // Confirmation always recomputes the decision. A changed preview cannot silently validate new rows.
    const expected = (body as Input & { expectedFingerprint?: string; expectedObligationIds?: string[] });
    if (expected.expectedFingerprint !== fingerprint || !Array.isArray(expected.expectedObligationIds) ||
      JSON.stringify([...expected.expectedObligationIds].sort()) !== JSON.stringify(matching.map(r => r.obligationId!).sort()))
      throw new ConflictException('La vista previa cambió. Vuelva a revisar el reporte.');
    for (const result of matching) {
      const r = input.rows[result.row - 1];
      const o = input.obligations.find(x => x.id === result.obligationId)!;
      const bankOperationKey = `${r.date}:${operation(r.operation)}`;
      const taken = await this.payments.findOne({ bankOperationKey }).lean();
      if (taken && (taken.studentDni !== r.dni || taken.mafObligationId !== o.id ||
        taken.concept !== o.conceptCode || cents(taken.amount) !== cents(r.amount)))
        throw new ConflictException(`La operación ${r.operation} ya está conciliada con otros datos.`);
      await this.payments.updateOne({ bankOperationKey }, { $setOnInsert: {
        bankOperationKey, paymentId: `BN-${bankOperationKey}`, studentDni: r.dni,
        concept: o.conceptCode, amount: r.amount, date: r.date, status: 'APROBADO',
        paymentMethod: 'BANCO_NACION', receiptNumber: r.operation,
        notes: `Conciliado con reporte ${input.fileName}`, mafObligationId: o.id,
      } }, { upsert: true });
    }
    const validatedObligationIds = matching.map(r => r.obligationId!);
    await this.imports.create({ fingerprint, fileName: input.fileName,
      rows: input.rows, results: results as unknown as Record<string, unknown>[], validatedObligationIds, importedAt: new Date().toISOString() });
    return { fingerprint, repeated: false, validatedObligationIds };
  }
}
