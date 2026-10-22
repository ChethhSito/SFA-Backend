import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'node:crypto';
import { Model } from 'mongoose';
import { Student, StudentDocument } from '../students/schemas/student.schema';
import { ServiceRequest, ServiceRequestDocument } from './service-request.schema';

const procedures = {
  ADM01: { name: 'Derecho de Examen de Admisión Ordinario', amount: 120 },
  MAT01: { name: 'Matrícula Semestral Regular', amount: 250 },
  CER01: { name: 'Certificado de Estudios Oficial', amount: 50 },
  CON01: { name: 'Constancia de Matrícula Institucional', amount: 30 },
  SUB01: { name: 'Derecho de Examen de Subsanación', amount: 45 },
  CAR01: { name: 'Duplicado de Carné de Estudiante', amount: 15 },
} as const;

@Injectable()
export class ServiceRequestsService {
  constructor(
    @InjectModel(ServiceRequest.name) private readonly requests: Model<ServiceRequestDocument>,
    @InjectModel(Student.name) private readonly students: Model<StudentDocument>,
  ) {}

  async list(studentDni?: string) {
    if (studentDni && !/^\d{8}$/.test(studentDni)) throw new BadRequestException('DNI inválido.');
    return this.requests.find(studentDni ? { studentDni } : {}).sort({ createdAt: -1 }).lean();
  }

  async create(input: { studentDni?: string; conceptCode?: string; source?: string; period?: string; reason?: string; requestedBy?: string; contactPhone?: string }) {
    const dni = String(input?.studentDni || '').trim();
    if (!/^\d{8}$/.test(dni)) throw new BadRequestException('Ingrese el DNI de un estudiante registrado.');
    const student = await this.students.findOne({ dni }).lean();
    if (!student || student.active === false) throw new NotFoundException('El estudiante no existe o está inactivo.');
    const code = String(input?.conceptCode || '') as keyof typeof procedures;
    const procedure = procedures[code];
    if (!procedure) throw new BadRequestException('La tasa no existe en el catálogo de solicitudes.');
    if (input.source !== 'estudiante' && input.source !== 'llamada_apoderado')
      throw new BadRequestException('Origen de solicitud inválido.');
    if (input.source === 'estudiante' && code !== 'CER01' && code !== 'CON01')
      throw new BadRequestException('El trámite no está disponible en el portal del estudiante.');
    const requestedBy = input.source === 'estudiante'
      ? `${student.name} ${student.lastName}`.trim() : String(input.requestedBy || '').trim();
    if (!requestedBy || requestedBy.length > 120)
      throw new BadRequestException('Identifique a la persona que realiza la llamada.');
    const contactPhone = String(input.contactPhone || '').trim();
    if (contactPhone.length > 30) throw new BadRequestException('Teléfono de contacto inválido.');
    const reason = String(input.reason || '').trim();
    if (reason.length > 300) throw new BadRequestException('El motivo no puede superar 300 caracteres.');
    const period = String(input.period || '').trim();
    if (period.length > 50) throw new BadRequestException('Período inválido.');
    return this.requests.create({
      id: `SOL-${randomUUID()}`,
      studentDni: dni,
      studentName: `${student.name} ${student.lastName}`.trim(),
      conceptCode: code,
      conceptName: procedure.name,
      amount: procedure.amount,
      period,
      source: input.source,
      requestedBy,
      contactPhone,
      reason,
      status: 'Pendiente',
    });
  }

  async updatePayment(id: string, input: { status?: string; paymentOperation?: string; paymentDate?: string; amountPaid?: number; bankName?: string }) {
    if (!/^SOL-[0-9a-f-]{36}$/i.test(id)) throw new BadRequestException('Solicitud inválida.');
    const status = String(input?.status || '');
    if (!['Pendiente', 'En Proceso', 'Validado', 'Observado', 'Exonerado'].includes(status))
      throw new BadRequestException('Estado inválido.');
    const paymentOperation = String(input.paymentOperation || '').trim();
    if (paymentOperation.length > 100) throw new BadRequestException('Operación demasiado larga.');
    const paymentDate = String(input.paymentDate || '').trim();
    if (paymentDate && !/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) throw new BadRequestException('Fecha de pago inválida.');
    const amountPaid = Number(input.amountPaid || 0);
    if (!Number.isFinite(amountPaid) || amountPaid < 0) throw new BadRequestException('Monto pagado inválido.');
    const bankName = String(input.bankName || '').trim();
    if (bankName.length > 100) throw new BadRequestException('Banco inválido.');
    const updated = await this.requests.findOneAndUpdate({ id },
      { status, paymentOperation, paymentDate, amountPaid, bankName }, { new: true }).lean();
    if (!updated) throw new NotFoundException('Solicitud no encontrada.');
    return updated;
  }

  async submitVoucher(id: string, input: { studentDni?: string; operationNumber?: string; paymentDate?: string; amountPaid?: number }) {
    if (!/^SOL-[0-9a-f-]{36}$/i.test(id)) throw new BadRequestException('Solicitud inválida.');
    const dni = String(input?.studentDni || '').trim();
    if (!/^\d{8}$/.test(dni)) throw new BadRequestException('DNI inválido.');
    const request = await this.requests.findOne({ id, studentDni: dni }).lean();
    if (!request) throw new NotFoundException('La solicitud no pertenece al estudiante indicado.');
    if (request.status !== 'Pendiente' && request.status !== 'Observado')
      throw new ConflictException('El voucher de esta solicitud ya está en revisión o fue validado.');
    const operationNumber = String(input?.operationNumber || '').trim();
    const paymentDate = String(input?.paymentDate || '').trim();
    const amountPaid = Number(input?.amountPaid);
    if (!operationNumber || operationNumber.length > 100) throw new BadRequestException('Ingrese el número de operación del voucher.');
    const parsedDate = new Date(`${paymentDate}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(paymentDate) || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== paymentDate)
      throw new BadRequestException('Ingrese la fecha del voucher.');
    if (!Number.isFinite(amountPaid) || amountPaid <= 0 || amountPaid > 100000)
      throw new BadRequestException('Ingrese el monto pagado.');
    const updated = await this.requests.findOneAndUpdate(
      { id, studentDni: dni, status: { $in: ['Pendiente', 'Observado'] } },
      { status: 'En Proceso', paymentOperation: operationNumber, paymentDate, amountPaid, bankName: 'Banco de la Nación' },
      { new: true },
    ).lean();
    if (!updated) throw new ConflictException('La solicitud cambió de estado. Actualice la página.');
    return updated;
  }
}
