import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Course, CourseDocument } from './schemas/course.schema';
import { Attendance, AttendanceDocument } from './schemas/attendance.schema';
import { CourseMaterial, CourseMaterialDocument } from './schemas/course-material.schema';
import { CourseAssignment, CourseAssignmentDocument } from './schemas/course-assignment.schema';
import { mergeAttendanceRecords, normalizeAttendanceDate } from './attendance.utils';
import { CourseEvidence, CourseEvidenceDocument } from './schemas/course-evidence.schema';
import { CourseObservation, CourseObservationDocument } from './schemas/course-observation.schema';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

type FileUpload = { courseId: string; week?: number; title: string; fileName: string; contentBase64: string; mimeType: string; category?: string };
const MAX_COURSE_FILE_BYTES = 10 * 1024 * 1024;
const COURSE_UPLOAD_DIR = process.env.COURSE_UPLOAD_DIR || join(process.cwd(), 'uploads', 'course-assets');
const ALLOWED_FILE_EXTENSIONS = new Set(['.pdf', '.docx', '.pptx', '.xlsx', '.png', '.jpg', '.jpeg', '.mp4']);

@Injectable()
export class CoursesService {
  constructor(
    @InjectModel(Course.name)
    private courseModel: Model<CourseDocument>,
    @InjectModel(Attendance.name)
    private attendanceModel: Model<AttendanceDocument>,
    @InjectModel(CourseMaterial.name)
    private materialModel: Model<CourseMaterialDocument>,
    @InjectModel(CourseAssignment.name)
    private assignmentModel: Model<CourseAssignmentDocument>,
    @InjectModel(CourseEvidence.name)
    private evidenceModel: Model<CourseEvidenceDocument>,
    @InjectModel(CourseObservation.name)
    private observationModel: Model<CourseObservationDocument>,
  ) {}

  async create(createCourseDto: any): Promise<CourseDocument> {
    const createdCourse = new this.courseModel(createCourseDto);
    return createdCourse.save();
  }

  async findAll(): Promise<CourseDocument[]> {
    return this.courseModel.find().exec();
  }

  async findByCode(code: string): Promise<CourseDocument> {
    const course = await this.courseModel.findOne({ code }).exec();
    if (!course) {
      throw new NotFoundException(`Course with code ${code} not found`);
    }
    return course;
  }

  async update(code: string, updateCourseDto: any): Promise<CourseDocument> {
    const { _id, id, ...cleanData } = updateCourseDto;
    const updated = await this.courseModel
      .findOneAndUpdate({ code }, { $set: cleanData }, { returnDocument: 'after' })
      .exec();
    if (!updated) {
      throw new NotFoundException(`Course with code ${code} not found`);
    }
    return updated;
  }

  async remove(code: string): Promise<any> {
    return this.courseModel.deleteOne({ code }).exec();
  }

  // --- ATTENDANCE (ASISTENCIAS) ---
  async getAttendance(courseId?: string) {
    const records = await this.attendanceModel.find(courseId ? { courseId } : {}).lean().exec();
    return mergeAttendanceRecords(records);
  }

  async saveAttendance(courseId: string, date: string, statusMap: Record<string, string>, week?: number): Promise<AttendanceDocument> {
    const isoDate = normalizeAttendanceDate(date);
    if (!courseId?.trim() || !isoDate) throw new BadRequestException('Seleccione un curso y una fecha válida.');
    if (!statusMap || typeof statusMap !== 'object' || Array.isArray(statusMap) || !Object.keys(statusMap).length) {
      throw new BadRequestException('Seleccione al menos un estado de asistencia.');
    }
    if (week !== undefined && (!Number.isInteger(week) || week < 1 || week > 52)) {
      throw new BadRequestException('La semana debe ser un número entre 1 y 52.');
    }
    const fields: Record<string, unknown> = { date: isoDate };
    for (const [dni, status] of Object.entries(statusMap)) {
      if (!/^\d{8}$/.test(dni) || !['Presente', 'Tardanza', 'Falta', 'Justificado'].includes(status)) {
        throw new BadRequestException('DNI o estado de asistencia inválido.');
      }
      fields[`statusMap.${dni}`] = status;
    }
    if (week !== undefined) fields.week = week;
    const [year, month, day] = isoDate.split('-');
    const legacyDate = `${day}/${month}/${year}`;
    // Update only the submitted students. Concurrent edits of other students
    // do not replace the complete status map; historical dates are normalized.
    return this.attendanceModel.findOneAndUpdate(
      { courseId, date: { $in: [isoDate, legacyDate] } },
      { $set: fields, $setOnInsert: { courseId } },
      { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: false },
    ).exec();
  }

  // --- MATERIALS (MATERIALES / SÍLABOS PDF) ---
  async getMaterials(courseId?: string): Promise<CourseMaterialDocument[]> {
    if (courseId) {
      return this.materialModel.find({ courseId }).exec();
    }
    return this.materialModel.find().exec();
  }

  private async saveCourseFile(dto: FileUpload) {
    if (!dto.courseId?.trim() || !dto.title?.trim() || !dto.fileName?.trim() || !dto.contentBase64) {
      throw new BadRequestException('Curso, título y archivo son obligatorios.');
    }
    const extension = extname(dto.fileName).toLowerCase();
    if (!ALLOWED_FILE_EXTENSIONS.has(extension) || !/^[\w.+-]+\/[\w.+-]+$/.test(dto.mimeType || '')) {
      throw new BadRequestException('Tipo de archivo no admitido.');
    }
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(dto.contentBase64)) throw new BadRequestException('Archivo inválido.');
    const bytes = Buffer.from(dto.contentBase64, 'base64');
    if (!bytes.length || bytes.length > MAX_COURSE_FILE_BYTES) throw new BadRequestException('El archivo debe tener como máximo 10 MB.');
    const storedFileName = `${randomUUID()}${extension}`;
    await mkdir(COURSE_UPLOAD_DIR, { recursive: true });
    await writeFile(join(COURSE_UPLOAD_DIR, storedFileName), bytes, { flag: 'wx' });
    return { storedFileName, fileSize: bytes.length, mimeType: dto.mimeType };
  }

  private async removeCourseFile(storedFileName?: string) {
    if (storedFileName && /^[0-9a-f-]{36}\.[a-z0-9]+$/i.test(storedFileName)) {
      await unlink(join(COURSE_UPLOAD_DIR, storedFileName)).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== 'ENOENT') throw error;
      });
    }
  }

  async getCourseFile(kind: 'materials' | 'evidences' | 'assignments', id: string) {
    const item = kind === 'materials'
      ? await this.materialModel.findById(id).lean().exec()
      : kind === 'evidences'
        ? await this.evidenceModel.findById(id).lean().exec()
        : await this.assignmentModel.findById(id).lean().exec();
    if (!item?.storedFileName) throw new NotFoundException('Archivo no encontrado.');
    const path = join(COURSE_UPLOAD_DIR, item.storedFileName);
    const data = await readFile(path).catch(() => { throw new NotFoundException('Archivo no encontrado en el servidor.'); });
    return { data, fileName: kind === 'assignments' ? (item as CourseAssignment).attachment! : (item as CourseMaterial | CourseEvidence).fileName,
      mimeType: item.mimeType || 'application/octet-stream' };
  }

  async saveMaterial(dto: FileUpload): Promise<CourseMaterialDocument> {
    const file = await this.saveCourseFile(dto);
    try {
      return await new this.materialModel({ courseId: dto.courseId, title: dto.title, fileName: dto.fileName,
        date: new Date().toISOString().slice(0, 10), ...file }).save();
    } catch (error) { await this.removeCourseFile(file.storedFileName); throw error; }
  }

  async deleteMaterial(id: string) {
    const item = await this.materialModel.findByIdAndDelete(id).exec();
    if (!item) throw new NotFoundException('Material no encontrado.');
    await this.removeCourseFile(item.storedFileName);
    return { success: true };
  }

  async getEvidences(courseId: string, week: number) {
    return this.evidenceModel.find({ courseId, week }).sort({ createdAt: -1 }).exec();
  }

  async saveEvidence(dto: FileUpload) {
    if (!Number.isInteger(dto.week) || dto.week! < 1 || dto.week! > 16 ||
        !['Fotografia', 'Reporte', 'Laboratorio', 'Actividad'].includes(dto.category || '')) {
      throw new BadRequestException('Semana o categoría inválida.');
    }
    const file = await this.saveCourseFile(dto);
    try {
      return await new this.evidenceModel({ courseId: dto.courseId, week: dto.week, category: dto.category,
        title: dto.title, fileName: dto.fileName, date: new Date().toISOString().slice(0, 10), ...file }).save();
    } catch (error) { await this.removeCourseFile(file.storedFileName); throw error; }
  }

  async deleteEvidence(id: string) {
    const item = await this.evidenceModel.findByIdAndDelete(id).exec();
    if (!item) throw new NotFoundException('Evidencia no encontrada.');
    await this.removeCourseFile(item.storedFileName);
    return { success: true };
  }

  async getObservations(courseId: string, week: number) {
    return this.observationModel.find({ courseId, week }).sort({ createdAt: -1 }).exec();
  }

  async saveObservation(dto: { courseId: string; week: number; type: string; text: string }) {
    if (!dto.courseId?.trim() || !Number.isInteger(dto.week) || dto.week < 1 || dto.week > 16 ||
        !['General', 'Incidencia', 'Acuerdo'].includes(dto.type) || !dto.text?.trim()) {
      throw new BadRequestException('Datos de observación inválidos.');
    }
    return new this.observationModel({ ...dto, text: dto.text.trim(), date: new Date().toLocaleDateString('es-PE', { timeZone: 'America/Lima' }) }).save();
  }

  async deleteObservation(id: string) {
    const item = await this.observationModel.findByIdAndDelete(id).exec();
    if (!item) throw new NotFoundException('Observación no encontrada.');
    return { success: true };
  }

  // --- ASSIGNMENTS (TAREAS Y ENTREGAS DE ALUMNOS) ---
  async getAssignments(courseId?: string): Promise<CourseAssignmentDocument[]> {
    if (courseId) {
      return this.assignmentModel.find({ courseId }).exec();
    }
    return this.assignmentModel.find().exec();
  }

  async saveAssignment(dto: { courseId: string; title: string; description: string; dueDate: string; kind?: string; attachment?: string; rubric?: string; contentBase64?: string; mimeType?: string; submissions?: CourseAssignment['submissions'] }): Promise<CourseAssignmentDocument> {
    this.validateAssignmentGrades(dto);
    if (dto.attachment && !dto.contentBase64) throw new BadRequestException('Adjunte el archivo real de la tarea.');
    const file = dto.attachment ? await this.saveCourseFile({ courseId: dto.courseId, title: dto.title,
      fileName: dto.attachment, contentBase64: dto.contentBase64!, mimeType: dto.mimeType || 'application/octet-stream' }) : null;
    try {
      const newAsg = new this.assignmentModel({ courseId: dto.courseId, title: dto.title, description: dto.description,
        dueDate: dto.dueDate, kind: dto.kind, attachment: dto.attachment, rubric: dto.rubric,
        submissions: dto.submissions || [], ...(file || {}) });
      return await newAsg.save();
    } catch (error) { await this.removeCourseFile(file?.storedFileName); throw error; }
  }

  private validateAssignmentGrades(dto: { submissions?: any[] }) {
    if (dto.submissions === undefined) return;
    if (!Array.isArray(dto.submissions)) throw new BadRequestException('Las calificaciones deben ser una lista.');
    const students = new Set<string>();
    dto.submissions.forEach((submission) => {
      if (!submission || typeof submission.studentDni !== 'string' || !submission.studentDni.trim() || students.has(submission.studentDni)) {
        throw new BadRequestException('Cada calificación debe identificar a un estudiante sin duplicados.');
      }
      students.add(submission.studentDni);
      if (submission.grade !== undefined && (typeof submission.grade !== 'number' || !Number.isFinite(submission.grade) || submission.grade < 0 || submission.grade > 20)) {
        throw new BadRequestException('La nota debe ser un número entre 0 y 20.');
      }
    });
  }

  async updateAssignment(id: string, dto: any): Promise<CourseAssignmentDocument> {
    this.validateAssignmentGrades(dto);
    const assignment = await this.assignmentModel.findById(id).exec();
    if (!assignment) throw new NotFoundException('Evaluación no encontrada.');
    // IDs, course ownership and metadata are not replaced by a grading request.
    if (dto.submissions) {
      const merged = new Map(assignment.submissions.map((submission) => [submission.studentDni, { ...submission }]));
      dto.submissions.forEach((submission: any) => {
        const previous = merged.get(submission.studentDni);
        merged.set(submission.studentDni, { ...previous, ...submission });
      });
      assignment.submissions = [...merged.values()];
      assignment.markModified('submissions');
    }
    return assignment.save();
  }

  async deleteAssignment(id: string) {
    const deleted = await this.assignmentModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException('Evaluación no encontrada.');
    await this.removeCourseFile(deleted.storedFileName);
    return { success: true };
  }

  async submitAssignment(assignmentId: string, submission: { studentDni: string; studentName: string; fileName: string; submitDate: string; grade?: number }): Promise<CourseAssignmentDocument> {
    this.validateAssignmentGrades({ submissions: [submission] });
    const asg = await this.assignmentModel.findById(assignmentId).exec();
    if (!asg) {
      throw new NotFoundException(`Tarea con ID ${assignmentId} no encontrada`);
    }
    const existingIndex = asg.submissions.findIndex(s => s.studentDni === submission.studentDni);
    if (existingIndex >= 0) {
      asg.submissions[existingIndex] = { ...asg.submissions[existingIndex], ...submission };
    } else {
      asg.submissions.push(submission);
    }
    asg.markModified('submissions');
    return asg.save();
  }

  // --- CLOSE GRADES (FIRMA Y CIERRE DE ACTAS DE NOTAS) ---
  async closeCourseGrades(code: string, teacherDni: string): Promise<CourseDocument> {
    const course = await this.courseModel.findOne({ code }).exec();
    if (!course) {
      throw new NotFoundException(`Curso con código ${code} no encontrado`);
    }
    course.isGradesClosed = true;
    course.closedByTeacherDni = teacherDni;
    course.closedAt = new Date().toISOString();
    return course.save();
  }
}

