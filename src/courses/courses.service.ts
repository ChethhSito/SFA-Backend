import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Course, CourseDocument } from './schemas/course.schema';
import { Attendance, AttendanceDocument } from './schemas/attendance.schema';
import { CourseMaterial, CourseMaterialDocument } from './schemas/course-material.schema';
import { CourseAssignment, CourseAssignmentDocument } from './schemas/course-assignment.schema';

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
    const updated = await this.courseModel
      .findOneAndUpdate({ code }, updateCourseDto, { new: true })
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
  async getAttendance(courseId: string): Promise<AttendanceDocument[]> {
    return this.attendanceModel.find({ courseId }).exec();
  }

  async saveAttendance(courseId: string, date: string, statusMap: Record<string, string>): Promise<AttendanceDocument> {
    const existing = await this.attendanceModel.findOne({ courseId, date }).exec();
    if (existing) {
      existing.statusMap = { ...existing.statusMap, ...statusMap };
      return existing.save();
    }
    const newAtt = new this.attendanceModel({ courseId, date, statusMap });
    return newAtt.save();
  }

  // --- MATERIALS (MATERIALES / SÍLABOS PDF) ---
  async getMaterials(courseId?: string): Promise<CourseMaterialDocument[]> {
    if (courseId) {
      return this.materialModel.find({ courseId }).exec();
    }
    return this.materialModel.find().exec();
  }

  async saveMaterial(dto: { courseId: string; title: string; fileName: string; date: string }): Promise<CourseMaterialDocument> {
    const newMat = new this.materialModel(dto);
    return newMat.save();
  }

  // --- ASSIGNMENTS (TAREAS Y ENTREGAS DE ALUMNOS) ---
  async getAssignments(courseId?: string): Promise<CourseAssignmentDocument[]> {
    if (courseId) {
      return this.assignmentModel.find({ courseId }).exec();
    }
    return this.assignmentModel.find().exec();
  }

  async saveAssignment(dto: { courseId: string; title: string; description: string; dueDate: string }): Promise<CourseAssignmentDocument> {
    const newAsg = new this.assignmentModel(dto);
    return newAsg.save();
  }

  async submitAssignment(assignmentId: string, submission: { studentDni: string; studentName: string; fileName: string; submitDate: string; grade?: number }): Promise<CourseAssignmentDocument> {
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
}
