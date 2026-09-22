import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import {
  AcademicPeriod, AcademicProgram, AcademicCourse, CurriculumVersion, CurriculumItem,
  AcademicTeacher, Classroom, AcademicShift, AcademicSchedule, AcademicGroup, AcademicProgramming,
} from './schemas/academic-planning.schemas';

export const MPA_MODELS = {
  periods: AcademicPeriod.name,
  careers: AcademicProgram.name,
  courses: AcademicCourse.name,
  curriculum: CurriculumItem.name,
  curriculum_versions: CurriculumVersion.name,
  shifts: AcademicShift.name,
  schedules: AcademicSchedule.name,
  classrooms: Classroom.name,
  groups: AcademicGroup.name,
  teachers: AcademicTeacher.name,
  tasks: AcademicProgramming.name,
} as const;
export type MpaKind = keyof typeof MPA_MODELS;
export const MPA_KINDS = Object.keys(MPA_MODELS) as MpaKind[];

@Injectable()
export class MpaService implements OnModuleInit {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async onModuleInit() {
    // MongoDB creates collections lazily; create them explicitly so TablePlus shows every MPA table.
    for (const kind of MPA_KINDS) {
      const model = this.model(kind);
      await model.createCollection();
      await model.createIndexes();
    }
  }

  async findAll(): Promise<Record<MpaKind, Record<string, unknown>[]>> {
    const result = {} as Record<MpaKind, Record<string, unknown>[]>;
    for (const kind of MPA_KINDS) result[kind] = await this.findOne(kind);
    return result;
  }

  async findOne(kind: string): Promise<Record<string, unknown>[]> {
    this.assertKind(kind);
    const records = await this.model(kind).find().lean().exec();
    return records.map(record => {
      const { _id, __v, createdAt, updatedAt, ...fields } = record as Record<string, unknown>;
      return fields;
    });
  }

  async save(kind: string, items: Record<string, unknown>[]): Promise<Record<string, unknown>[]> {
    this.assertKind(kind);
    await this.validate(kind, items);
    await this.replace(kind, items);
    return items;
  }

  private model(kind: MpaKind) { return this.connection.model(MPA_MODELS[kind]); }
  private isKind(value: string): value is MpaKind { return Object.prototype.hasOwnProperty.call(MPA_MODELS, value); }
  private assertKind(kind: string): asserts kind is MpaKind {
    if (!this.isKind(kind)) throw new NotFoundException(`Colección MPA ${kind} no encontrada`);
  }

  private async replace(kind: MpaKind, items: Record<string, unknown>[]) {
    const model = this.model(kind);
    const key = kind === 'teachers' ? 'dni' : 'id';
    if (items.length) {
      await model.bulkWrite(items.map(item => ({ updateOne: {
        filter: { [key]: item[key] }, update: { $set: item }, upsert: true,
      } })));
    }
    await model.deleteMany(items.length ? { [key]: { $nin: items.map(item => item[key]) } } : {}).exec();
  }

  private async validate(kind: MpaKind, items: Record<string, unknown>[]) {
    if (items.length > 5000) throw new BadRequestException('La colección excede 5000 registros');
    const key = kind === 'teachers' ? 'dni' : 'id';
    const ids = new Set<string>();
    for (const item of items) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) throw new BadRequestException('Cada registro debe ser un objeto');
      const id = item[key];
      if (typeof id !== 'string' || !id.trim()) throw new BadRequestException(`Falta ${key} en ${kind}`);
      if (ids.has(id)) throw new BadRequestException(`${key} duplicado: ${id}`);
      ids.add(id);
      try { await new (this.model(kind))(item).validate(); }
      catch (error) { throw new BadRequestException(`Registro ${id} inválido: ${error instanceof Error ? error.message : String(error)}`); }
    }
    if (kind === 'tasks') {
      const groups = await this.model('groups').find().lean().exec();
      this.validateTasks(items, groups);
    }
  }

  private validateTasks(items: Record<string, unknown>[], groups: Record<string, unknown>[]) {
    const periodByGroup = new Map(groups.map(group => [group.id, group.periodId]));
    for (const task of items) {
      if (!periodByGroup.has(task.groupId)) throw new BadRequestException(`El grupo ${task.groupId} no existe`);
      const start = this.minutes(task.startTime as string);
      const end = this.minutes(task.endTime as string);
      if (start === null || end === null || start >= end) throw new BadRequestException('Rango horario inválido');
    }
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i], b = items[j];
        if (periodByGroup.get(a.groupId) !== periodByGroup.get(b.groupId) || a.dayOfWeek !== b.dayOfWeek) continue;
        if (this.minutes(a.startTime as string)! >= this.minutes(b.endTime as string)! || this.minutes(b.startTime as string)! >= this.minutes(a.endTime as string)!) continue;
        for (const field of ['groupId', 'teacherDni', 'classroomId']) {
          if (a[field] === b[field]) throw new BadRequestException(`Cruce de horario: ${field}`);
        }
      }
    }
  }

  private minutes(value: string): number | null {
    const match = value?.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!match) return null;
    let hour = Number(match[1]);
    const minute = Number(match[2]);
    if (minute > 59 || hour > (match[3] ? 12 : 23) || (match[3] && hour < 1)) return null;
    if (match[3]) hour = hour % 12 + (match[3].toUpperCase() === 'PM' ? 12 : 0);
    return hour * 60 + minute;
  }
}
