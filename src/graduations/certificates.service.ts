import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { createHash, randomUUID } from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import { IssuedCertificate, IssuedCertificateDocument } from './schemas/issued-certificate.schema';
import { Graduation, GraduationDocument } from './schemas/graduation.schema';
import { Student, StudentDocument } from '../students/schemas/student.schema';

export interface CertificateInput { studentDni: string; number: string; issuedDate: string; issuerName: string; fileName: string; fileData: string }

@Injectable()
export class CertificatesService {
  constructor(@InjectModel(IssuedCertificate.name) private readonly certificateModel: Model<IssuedCertificateDocument>,
    @InjectModel(Graduation.name) private readonly graduationModel: Model<GraduationDocument>,
    @InjectModel(Student.name) private readonly studentModel: Model<StudentDocument>) {}

  list() { return this.certificateModel.find().sort({ registeredAt: -1 }).lean().exec(); }
  listForStudent(dni: string) {
    if (!/^\d{8}$/.test(dni)) throw new BadRequestException('DNI inválido.');
    return this.certificateModel.find({ studentDni: dni }).sort({ registeredAt: -1 }).lean().exec();
  }

  async register(body: CertificateInput, actor: string) {
    if (!body || !/^\d{8}$/.test(body.studentDni) || typeof body.number !== 'string' || !body.number.trim() || body.number.trim().length > 80 ||
      typeof body.issuerName !== 'string' || !body.issuerName.trim() || body.issuerName.trim().length > 150 || typeof actor !== 'string' || !actor) {
      throw new BadRequestException('Complete DNI, número y firmante según el documento.');
    }
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.issuedDate) || !Number.isFinite(Date.parse(body.issuedDate)) ||
      new Date(body.issuedDate).toISOString().slice(0, 10) !== body.issuedDate || body.issuedDate > today) {
      throw new BadRequestException('Ingrese la fecha real de emisión, hasta hoy.');
    }
    if (typeof body.fileName !== 'string' || !body.fileName.toLowerCase().endsWith('.pdf') || typeof body.fileData !== 'string' ||
      body.fileData.length > 7_000_000 || body.fileData.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(body.fileData)) {
      throw new BadRequestException('Adjunte un PDF válido de hasta 5 MB.');
    }
    const bytes = Buffer.from(body.fileData, 'base64');
    if (bytes.length > 5 * 1024 * 1024 || bytes.subarray(0, 5).toString() !== '%PDF-') throw new BadRequestException('El archivo no es un PDF válido de hasta 5 MB.');
    try { if (!(await PDFDocument.load(bytes)).getPageCount()) throw new Error('Empty PDF'); }
    catch { throw new BadRequestException('No se pudo leer el PDF. Use un documento válido sin contraseña.'); }
    const [graduation, student] = await Promise.all([
      this.graduationModel.findOne({ studentDni: body.studentDni }).lean().exec(),
      this.studentModel.findOne({ dni: body.studentDni }).lean().exec(),
    ]);
    if (!student || !graduation) throw new NotFoundException('Estudiante o expediente no encontrado.');
    if (graduation.status !== 'Apto' || !['solicitud', 'constanciaEgresado', 'practicasPre', 'pagoDerecho'].every((key) => graduation.docsChecked?.[key] === true)) {
      throw new BadRequestException('El expediente debe estar apto y tener todos los requisitos revisados.');
    }
    const number = body.number.trim().toUpperCase();
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const existing = await this.certificateModel.findOne({ studentDni: body.studentDni, active: true }).lean().exec();
    if (existing) {
      if (existing.number === number && existing.sha256 === sha256 && existing.issuedDate === body.issuedDate && existing.issuerName === body.issuerName.trim()) return existing;
      throw new ConflictException('Ya hay un certificado vigente. Debe revocarlo con motivo antes de registrar otro.');
    }
    try {
      const saved = await this.certificateModel.create({ studentDni: body.studentDni, studentName: `${student.name} ${student.lastName}`.trim(), number,
        issuedDate: body.issuedDate, issuerName: body.issuerName.trim(), fileName: body.fileName.replace(/[^\p{L}\p{N}_. -]/gu, '_').slice(-120),
        fileData: body.fileData, sha256, verificationCode: randomUUID(), registeredAt: new Date(), registeredBy: actor, active: true });
      const { fileData: omitted, ...metadata } = saved.toObject();
      return metadata;
    } catch (error) {
      if ((error as { code?: number }).code === 11000) throw new ConflictException('El número ya está registrado o existe otro certificado vigente. Actualice la lista.');
      throw error;
    }
  }

  async getFile(id: string) {
    if (!isValidObjectId(id)) throw new BadRequestException('Documento inválido.');
    const record = await this.certificateModel.findById(id).select('+fileData').lean().exec();
    if (!record) throw new NotFoundException('Documento no encontrado.');
    return { fileName: record.fileName, fileData: record.fileData, sha256: record.sha256, active: record.active };
  }

  async revoke(id: string, reason: string, actor: string) {
    if (!isValidObjectId(id) || typeof reason !== 'string' || !reason.trim() || reason.trim().length > 2000) throw new BadRequestException('Ingrese el motivo de la revocación.');
    const saved = await this.certificateModel.findOneAndUpdate({ _id: id, active: true }, { $set: { active: false, revokedAt: new Date(), revocationReason: reason.trim(), revokedBy: actor } },
      { returnDocument: 'after', runValidators: true }).lean().exec();
    if (saved) return saved;
    const existing = await this.certificateModel.findById(id).lean().exec();
    if (!existing) throw new NotFoundException('Documento no encontrado.');
    return existing;
  }

  async verify(code: string) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(code)) throw new BadRequestException('Código de verificación inválido.');
    const record = await this.certificateModel.findOne({ verificationCode: code }).lean().exec();
    if (!record) throw new NotFoundException('No existe un documento con ese código.');
    // Public verification deliberately excludes student identity, staff and the original PDF.
    return { registered: true, active: record.active, number: record.number, issuedDate: record.issuedDate, sha256: record.sha256,
      registeredAt: record.registeredAt, revokedAt: record.revokedAt,
      signatureValidation: 'NO_REALIZADA', message: 'Verifica el registro y la integridad del archivo. No valida criptográficamente su firma.' };
  }
}
