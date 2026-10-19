import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AnalyticsService, StudentRiskAssessment } from './analytics.service';
import { AcademicAlert, AcademicAlertDocument } from './schemas/academic-alert.schema';

export function academicAlertCandidates(students: StudentRiskAssessment[]) {
  return students.flatMap((student) => {
    const result: { key: string; studentDni: string; studentName: string; kind: string; level: string; value: number; message: string }[] = [];
    const add = (kind: string, value: number, level: string, message: string) => result.push({ key: `${student.studentDni}:${kind}`, studentDni: student.studentDni, studentName: student.studentName, kind, level, value, message });
    const attendance = student.metrics.attendanceRate;
    const grade = student.metrics.currentGpa;
    if (typeof attendance === 'number' && Number.isFinite(attendance) && attendance >= 0 && attendance < 82) {
      add('ASISTENCIA', attendance, attendance < 72 ? 'CRITICO' : 'MODERADO', `Asistencia registrada: ${attendance}%. Requiere revisión del registro y seguimiento.`);
    }
    if (typeof grade === 'number' && Number.isFinite(grade) && grade >= 0 && grade < 12.5) {
      add('NOTAS', grade, grade < 10.5 ? 'CRITICO' : 'MODERADO', `Promedio registrado: ${grade}/20. Requiere seguimiento académico.`);
    }
    return result;
  });
}

@Injectable()
export class AcademicAlertsService {
  private refreshing: Promise<unknown> | null = null;
  constructor(private readonly analytics: AnalyticsService,
    @InjectModel(AcademicAlert.name) private readonly alertModel: Model<AcademicAlertDocument>) {}

  list() { return this.alertModel.find().sort({ active: -1, detectedAt: -1 }).lean().exec(); }

  async refresh() {
    if (this.refreshing) return this.refreshing;
    this.refreshing = this.synchronize();
    try { return await this.refreshing; } finally { this.refreshing = null; }
  }

  private async synchronize() {
    // Calculate successfully before changing any persisted notification.
    const report = await this.analytics.calculateAttritionRisk();
    const candidates = academicAlertCandidates(report.students);
    const date = new Date();
    for (const candidate of candidates) {
      const observed = { studentName: candidate.studentName, value: candidate.value, message: candidate.message, evaluatedAt: date };
      const sameLevel = await this.alertModel.updateOne({ key: candidate.key, active: true, level: candidate.level }, { $set: observed }).exec();
      if (sameLevel.matchedCount) continue;
      try {
        await this.alertModel.findOneAndUpdate({ key: candidate.key, $or: [{ active: { $ne: true } }, { level: { $ne: candidate.level } }] }, {
          $set: { ...candidate, active: true, readAt: null, detectedAt: date, evaluatedAt: date, resolvedAt: null, resolutionReason: '' },
        }, { upsert: true, returnDocument: 'after', runValidators: true }).exec();
      } catch (error) {
        if ((error as { code?: number }).code !== 11000) throw error;
        await this.alertModel.updateOne({ key: candidate.key, active: true, level: candidate.level }, { $set: observed }).exec();
      }
    }
    const observed = new Set(candidates.map((candidate) => candidate.key));
    const students = new Map(report.students.map((student) => [student.studentDni, student]));
    const activeAlerts = await this.alertModel.find({ active: true }).lean().exec();
    for (const alert of activeAlerts) {
      if (observed.has(alert.key)) continue;
      const student = students.get(alert.studentDni);
      const value = alert.kind === 'ASISTENCIA' ? student?.metrics.attendanceRate : student?.metrics.currentGpa;
      const resolutionReason = !student ? 'INACTIVO' : typeof value !== 'number' ? 'SIN_DATOS' : 'RECUPERADO';
      await this.alertModel.updateOne({ key: alert.key, active: true }, { $set: { active: false, resolvedAt: date, evaluatedAt: date, resolutionReason } }).exec();
    }
    return { alerts: await this.list(), refreshedAt: date.toISOString() };
  }

  async markRead(key: string, detectedAt: string) {
    if (!/^\d{8}:(ASISTENCIA|NOTAS)$/.test(key)) throw new BadRequestException('Aviso inválido.');
    if (typeof detectedAt !== 'string' || !Number.isFinite(Date.parse(detectedAt))) throw new BadRequestException('Falta la versión de la alerta.');
    const existing = await this.alertModel.findOne({ key }).lean().exec();
    if (!existing) throw new NotFoundException('Aviso no encontrado.');
    if (new Date(existing.detectedAt).getTime() !== Date.parse(detectedAt)) throw new ConflictException('La alerta cambió. Actualice antes de marcarla como leída.');
    if (existing.readAt) return existing;
    const saved = await this.alertModel.findOneAndUpdate({ key, readAt: null, detectedAt: new Date(detectedAt) }, { $set: { readAt: new Date() } }, { returnDocument: 'after' }).lean().exec();
    if (saved) return saved;
    const current = await this.alertModel.findOne({ key }).lean().exec();
    if (current && new Date(current.detectedAt).getTime() === Date.parse(detectedAt) && current.readAt) return current;
    throw new ConflictException('La alerta cambió. Actualice antes de marcarla como leída.');
  }
}
