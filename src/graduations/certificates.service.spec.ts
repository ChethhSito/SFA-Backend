import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';
import { CertificateManagementGuard } from './certificate-management.guard';
import { CertificatesService } from './certificates.service';

describe('Institutional PDF registration', () => {
  const query = (value: unknown) => ({ lean: () => ({ exec: async () => value }) });
  const docs = { solicitud: true, constanciaEgresado: true, practicasPre: true, pagoDerecho: true };
  async function setup() {
    const pdf = await PDFDocument.create(); pdf.addPage();
    const input = { studentDni: '12345678', number: 'CERT-PRUEBA', issuedDate: '2020-01-01', issuerName: 'Firmante de prueba', fileName: 'prueba.pdf', fileData: Buffer.from(await pdf.save()).toString('base64') };
    const certificate = { findOne: jest.fn(() => query(null)), create: jest.fn(async (row: Record<string, unknown>) => ({ toObject: () => ({ _id: 'id', ...row }) })) };
    const graduation = { findOne: jest.fn(() => query({ status: 'Apto', docsChecked: docs })) };
    const students = { findOne: () => query({ name: 'Prueba', lastName: 'Temporal' }) };
    return { service: new CertificatesService(certificate as never, graduation as never, students as never), input, certificate, graduation };
  }
  it('accepts a parseable PDF and returns metadata without exposing its base64 data', async () => {
    const { service, input, certificate } = await setup();
    const result = await service.register(input, 'firebase-test-user');
    expect(result).toMatchObject({ number: 'CERT-PRUEBA', studentDni: input.studentDni, registeredBy: 'firebase-test-user', active: true });
    expect(result).not.toHaveProperty('fileData');
    expect(result.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(certificate.create.mock.calls[0][0].fileData).toBe(input.fileData);
  });
  it('rejects invalid PDFs, future dates and incomplete prerequisites before writing', async () => {
    const { service, input, certificate, graduation } = await setup();
    await expect(service.register({ ...input, fileData: Buffer.from('not pdf').toString('base64') }, 'test')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.register({ ...input, issuedDate: '2999-01-01' }, 'test')).rejects.toBeInstanceOf(BadRequestException);
    graduation.findOne.mockReturnValue(query({ status: 'Solicitado', docsChecked: docs }));
    await expect(service.register(input, 'test')).rejects.toBeInstanceOf(BadRequestException);
    expect(certificate.create).not.toHaveBeenCalled();
  });
  it('public verification exposes no student identity, staff identity or document bytes', async () => {
    const { service, certificate } = await setup();
    certificate.findOne.mockReturnValue(query({ studentDni: '12345678', studentName: 'Privado', fileData: 'private', number: 'CERT-PRUEBA', active: true, sha256: 'hash' }) as never);
    const result = await service.verify('12345678-1234-1234-1234-123456789abc');
    expect(result).toMatchObject({ registered: true, signatureValidation: 'NO_REALIZADA' });
    expect(result).not.toHaveProperty('studentDni'); expect(result).not.toHaveProperty('studentName'); expect(result).not.toHaveProperty('fileData');
  });
  it('does not authorize document management from an ordinary Firebase user', () => {
    const context = (user: unknown) => ({ switchToHttp: () => ({ getRequest: () => ({ user }) }) });
    const guard = new CertificateManagementGuard();
    expect(() => guard.canActivate(context({ uid: 'test', role: 'alumno' }) as never)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context({ uid: 'test' }) as never)).toThrow(ForbiddenException);
    expect(guard.canActivate(context({ uid: 'test', role: 'mge' }) as never)).toBe(true);
  });
});
