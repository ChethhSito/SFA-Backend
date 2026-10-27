import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { Enrollment, EnrollmentDocument } from './schemas/enrollment.schema';
import { Student, StudentDocument } from '../students/schemas/student.schema';

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectModel(Enrollment.name)
    private enrollmentModel: Model<EnrollmentDocument>,
    @InjectModel(Student.name) private studentModel: Model<StudentDocument>,
    @InjectConnection() private connection: Connection,
  ) {}

  async registerCourses(studentDni: string, items: { courseId: string; groupId: string }[]): Promise<EnrollmentDocument> {
    if (!Array.isArray(items) || items.length === 0 || items.length > 20) {
      throw new BadRequestException('Seleccione entre 1 y 20 asignaturas');
    }
    const enrollment = await this.enrollmentModel.findOne({ studentDni }).exec();
    if (!enrollment) throw new NotFoundException(`Enrollment for student DNI ${studentDni} not found`);
    if (enrollment.academicStatus !== 'MATRICULADO' || !enrollment.groupId) {
      throw new BadRequestException('El alumno necesita una matrícula activa y un grupo académico asignado');
    }
    const baseGroup = await this.connection.collection('academic_groups').findOne({ id: enrollment.groupId });
    if (!baseGroup) throw new BadRequestException('El grupo principal de la matrícula no existe en MPA');

    const [groups, curriculum] = await Promise.all([
      this.connection.collection('academic_groups').find({
        periodId: baseGroup.periodId, careerId: enrollment.programId, cycle: baseGroup.cycle,
      }).toArray(),
      this.connection.collection('curriculum_items').find({
        careerId: enrollment.programId, cycle: baseGroup.cycle,
      }).toArray(),
    ]);
    const eligible = new Set(curriculum.filter((item) =>
      !baseGroup.curriculumVersionId || !item.versionId || item.versionId === baseGroup.curriculumVersionId,
    ).map((item) => item.courseId));
    const groupById = new Map(groups.map((group) => [group.id, group]));
    const uniqueCourses = new Set<string>();
    for (const item of items) {
      if (!item || typeof item.courseId !== 'string' || typeof item.groupId !== 'string') {
        throw new BadRequestException('Cada asignatura requiere curso y grupo');
      }
      if (uniqueCourses.has(item.courseId)) throw new BadRequestException('No puede matricular dos grupos de la misma asignatura');
      uniqueCourses.add(item.courseId);
      if (!eligible.has(item.courseId)) throw new BadRequestException(`La asignatura ${item.courseId} no pertenece a la malla y ciclo del alumno`);
      const group = groupById.get(item.groupId);
      if (!group || (baseGroup.curriculumVersionId && group.curriculumVersionId && group.curriculumVersionId !== baseGroup.curriculumVersionId)) {
        throw new BadRequestException(`El grupo ${item.groupId} no pertenece al período, programa, ciclo y malla del alumno`);
      }
    }

    const tasks = await this.connection.collection('academic_programming').find({
      groupId: { $in: items.map((item) => item.groupId) },
      courseId: { $in: items.map((item) => item.courseId) },
    }).toArray();
    const sessions = items.flatMap((item) => tasks.filter((task) => task.groupId === item.groupId && task.courseId === item.courseId));
    for (const item of items) {
      if (!sessions.some((task) => task.groupId === item.groupId && task.courseId === item.courseId)) {
        throw new BadRequestException(`La asignatura ${item.courseId} no tiene horario en el grupo ${item.groupId}`);
      }
    }
    for (let i = 0; i < sessions.length; i++) {
      for (let j = i + 1; j < sessions.length; j++) {
        const a = sessions[i], b = sessions[j];
        if (a.dayOfWeek === b.dayOfWeek && this.minutes(a.startTime) < this.minutes(b.endTime)
          && this.minutes(b.startTime) < this.minutes(a.endTime)) {
          throw new BadRequestException(`Cruce de horario el ${a.dayOfWeek} entre dos asignaturas seleccionadas`);
        }
      }
    }

    const saved = await this.enrollmentModel.findOneAndUpdate(
      { studentDni }, { $set: { registeredCourses: items } }, { returnDocument: 'after' },
    ).exec();
    if (!saved) throw new NotFoundException(`Enrollment for student DNI ${studentDni} not found`);
    return saved;
  }

  private minutes(value: string): number {
    const match = value?.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!match) return Number.NaN;
    let hour = Number(match[1]);
    if (match[3]) hour = (hour % 12) + (match[3].toUpperCase() === 'PM' ? 12 : 0);
    return hour * 60 + Number(match[2]);
  }

  async create(createEnrollmentDto: any): Promise<EnrollmentDocument> {
    await this.assertActive(createEnrollmentDto.studentDni);
    const createdEnrollment = new this.enrollmentModel(createEnrollmentDto);
    return createdEnrollment.save();
  }

  async findAll(): Promise<EnrollmentDocument[]> {
    const list = await this.enrollmentModel.find().exec();
    return list.map((item) => {
      const doc = item.toObject ? item.toObject() : item;
      if (doc.shift) {
        doc.shift = doc.shift.replace(/Ma[\uFFFD\?a-zA-Z]*ana/gi, 'Mañana').replace(/Maana/gi, 'Mañana');
      }
      return doc;
    }) as EnrollmentDocument[];
  }

  async findByDni(studentDni: string): Promise<EnrollmentDocument> {
    const enrollment = await this.enrollmentModel.findOne({ studentDni }).exec();
    if (!enrollment) {
      throw new NotFoundException(`Enrollment for student DNI ${studentDni} not found`);
    }
    const doc = enrollment.toObject ? enrollment.toObject() : enrollment;
    if (doc.shift) {
      doc.shift = doc.shift.replace(/Ma[\uFFFD\?a-zA-Z]*ana/gi, 'Mañana').replace(/Maana/gi, 'Mañana');
    }
    return doc as EnrollmentDocument;
  }

  async update(studentDni: string, updateEnrollmentDto: any): Promise<EnrollmentDocument> {
    if (updateEnrollmentDto.academicStatus === 'MATRICULADO') await this.assertActive(studentDni);
    const { _id, id, ...cleanData } = updateEnrollmentDto;
    const updated = await this.enrollmentModel
      .findOneAndUpdate({ studentDni }, { $set: cleanData }, { returnDocument: 'after' })
      .exec();
    if (!updated) {
      throw new NotFoundException(`Enrollment for student DNI ${studentDni} not found`);
    }
    return updated;
  }

  async remove(studentDni: string): Promise<any> {
    return this.enrollmentModel.deleteOne({ studentDni }).exec();
  }

  private async assertActive(dni: string) {
    const student = await this.studentModel.findOne({ dni }).exec();
    if (student?.active === false) throw new BadRequestException('El estudiante está de baja. Reactívelo desde el padrón antes de matricularlo.');
  }
}
