import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'node:crypto';
import { Connection, Model } from 'mongoose';
import { Student, StudentDocument } from '../students/schemas/student.schema';
import { Teacher, TeacherDocument } from '../teachers/schemas/teacher.schema';
import { ServiceRequest, ServiceRequestDocument } from './service-request.schema';

const procedures = {
  ADM01: { name: 'Derecho de Examen de Admisión Ordinario', amount: 120 },
  MAT01: { name: 'Matrícula Semestral Regular', amount: 250 },
  CER01: { name: 'Certificado de Estudios Oficial', amount: 50 },
  CON01: { name: 'Constancia de Matrícula Institucional', amount: 30 },
  SUB01: { name: 'Derecho de Examen de Subsanación', amount: 45 },
  CAR01: { name: 'Duplicado de Carné de Estudiante', amount: 15 },
  DOC01: { name: 'Constancia de Trabajo Docente', amount: 30 },
  DOC02: { name: 'Certificado de Servicios Docentes', amount: 50 },
} as const;

@Injectable()
export class ServiceRequestsService {
  constructor(
    @InjectModel(ServiceRequest.name) private readonly requests: Model<ServiceRequestDocument>,
    @InjectModel(Student.name) private readonly students: Model<StudentDocument>,
    @InjectModel(Teacher.name) private readonly teachers: Model<TeacherDocument>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async list(studentDni?: string, teacherDni?: string) {
    if (studentDni && !/^\d{8}$/.test(studentDni)) throw new BadRequestException('DNI inválido.');
    if (teacherDni && !/^\d{8}$/.test(teacherDni)) throw new BadRequestException('DNI docente inválido.');
    return this.requests.find(studentDni ? { studentDni } : teacherDni ? { teacherDni } : {}).sort({ createdAt: -1 }).lean();
  }

  async create(input: { studentDni?: string; teacherDni?: string; conceptCode?: string; source?: string; period?: string; reason?: string; requestedBy?: string; contactPhone?: string }) {
    const isTeacher = input?.source === 'docente';
    const dni = String((isTeacher ? input?.teacherDni : input?.studentDni) || '').trim();
    if (!/^\d{8}$/.test(dni)) throw new BadRequestException('Ingrese el DNI de un estudiante registrado.');
    const person = isTeacher ? await this.teachers.findOne({ dni }).lean() : await this.students.findOne({ dni }).lean();
    if (!person || (!isTeacher && 'active' in person && person.active === false)) throw new NotFoundException('El solicitante no existe o está inactivo.');
    const code = String(input?.conceptCode || '') as keyof typeof procedures;
    const procedure = procedures[code];
    if (!procedure) throw new BadRequestException('La tasa no existe en el catálogo de solicitudes.');
    const catalog = await this.connection.collection('maf_state').findOne({ key: 'concepts' });
    const configured = (Array.isArray(catalog?.items) ? catalog.items : []).find(
      (item: any) => item?.code === code,
    ) as { name?: string; amount?: number; active?: boolean } | undefined;
    if (configured?.active === false) throw new BadRequestException('El concepto está desactivado.');
    const amount = configured && Number.isFinite(configured.amount) && configured.amount! > 0 && configured.amount! <= 10000
      ? configured.amount! : procedure.amount;
    if (input.source !== 'estudiante' && input.source !== 'docente' && input.source !== 'llamada_apoderado')
      throw new BadRequestException('Origen de solicitud inválido.');
    if (input.source === 'estudiante' && code !== 'CER01' && code !== 'CON01')
      throw new BadRequestException('El trámite no está disponible en el portal del estudiante.');
    if (isTeacher && code !== 'DOC01' && code !== 'DOC02') throw new BadRequestException('El trámite no está disponible para el docente.');
    if (!isTeacher && (code === 'DOC01' || code === 'DOC02')) throw new BadRequestException('El trámite requiere un docente registrado.');
    const requestedBy = input.source === 'estudiante' || isTeacher
      ? `${person.name} ${person.lastName}`.trim() : String(input.requestedBy || '').trim();
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
      studentDni: isTeacher ? '' : dni,
      teacherDni: isTeacher ? dni : '',
      studentName: `${person.name} ${person.lastName}`.trim(),
      conceptCode: code,
      conceptName: procedure.name,
      amount,
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
    if (!['Pendiente', 'En Proceso', 'Observado'].includes(status))
      throw new BadRequestException('La validación del pago solo se realiza mediante conciliación bancaria.');
    const paymentOperation = String(input.paymentOperation || '').trim();
    if (paymentOperation.length > 100) throw new BadRequestException('Operación demasiado larga.');
    const paymentDate = String(input.paymentDate || '').trim();
    if (paymentDate && !/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) throw new BadRequestException('Fecha de pago inválida.');
    const amountPaid = Number(input.amountPaid || 0);
    if (!Number.isFinite(amountPaid) || amountPaid < 0) throw new BadRequestException('Monto pagado inválido.');
    const bankName = String(input.bankName || '').trim();
    if (bankName.length > 100) throw new BadRequestException('Banco inválido.');
    const updated = await this.requests.findOneAndUpdate({ id, status: { $ne: 'Validado' } },
      { status, paymentOperation, paymentDate, amountPaid, bankName,
        ...(status === 'En Proceso' && paymentOperation ? { voucherRegisteredAt: new Date() } : {}) }, { new: true }).lean();
    if (!updated) throw new ConflictException('La solicitud no existe o su pago ya fue validado.');
    return updated;
  }

  async submitVoucher(id: string, input: { studentDni?: string; teacherDni?: string; operationNumber?: string; paymentDate?: string; amountPaid?: number }) {
    if (!/^SOL-[0-9a-f-]{36}$/i.test(id)) throw new BadRequestException('Solicitud inválida.');
    const dni = String(input?.studentDni || input?.teacherDni || '').trim();
    if (!/^\d{8}$/.test(dni)) throw new BadRequestException('DNI inválido.');
    const owner = input?.teacherDni ? { teacherDni: dni } : { studentDni: dni };
    const request = await this.requests.findOne({ id, ...owner }).lean();
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
      { id, ...owner, status: { $in: ['Pendiente', 'Observado'] } },
      { status: 'En Proceso', paymentOperation: operationNumber, paymentDate, amountPaid, bankName: 'Banco de la Nación', voucherRegisteredAt: new Date() },
      { new: true },
    ).lean();
    if (!updated) throw new ConflictException('La solicitud cambió de estado. Actualice la página.');
    return updated;
  }

  async deliverResult(id: string, file: { mimetype: string; buffer: Buffer; originalname: string }) {
    if (!file || file.mimetype !== 'application/pdf' || !file.buffer?.length || file.buffer.length > 5_000_000 || file.buffer.subarray(0, 5).toString() !== '%PDF-')
      throw new BadRequestException('Adjunte un PDF válido de hasta 5 MB.');
    const updated = await this.requests.findOneAndUpdate({ id, status: 'Validado' }, {
      $set: { deliveryStatus: 'Emitido', resultFileName: file.originalname.slice(0, 180), resultPdf: file.buffer },
    }, { new: true }).select('-resultPdf').lean();
    if (!updated) throw new BadRequestException('El pago debe estar validado antes de emitir el documento.');
    return updated;
  }

  async resultPdf(id: string, dni: string) {
    const request = await this.requests.findOne({ id, $or: [{ studentDni: dni }, { teacherDni: dni }] }).select('+resultPdf').lean();
    if (!request || request.deliveryStatus !== 'Emitido' || !request.resultPdf) throw new NotFoundException('Documento no disponible.');
    return { name: request.resultFileName || 'resultado.pdf', data: request.resultPdf };
  }
}
