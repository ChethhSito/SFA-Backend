import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Course, CourseDocument } from './schemas/course.schema';

@Injectable()
export class CoursesService {
  constructor(
    @InjectModel(Course.name)
    private courseModel: Model<CourseDocument>,
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
}
