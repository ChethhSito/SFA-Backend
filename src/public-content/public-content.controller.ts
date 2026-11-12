import { BadRequestException, Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { StaffSessionGuard } from '../users/staff-session.guard';

@Controller('public-content')
export class PublicContentController {
  constructor(@InjectConnection() private readonly db: Connection) {}

  @Get('catalog')
  async catalog() {
    const [careers, courses, versions, items, maf] = await Promise.all([
      this.db.collection('careers').find({ status: { $ne: 'Inactivo' } }).project({ _id: 0, id: 1, code: 1, name: 1, description: 1, durationSemesters: 1 }).toArray(),
      this.db.collection('academic_courses').find({ status: { $ne: 'Inactivo' } }).project({ _id: 0, id: 1, name: 1, careerId: 1, referenceCycle: 1 }).toArray(),
      this.db.collection('curriculum_versions').find({ isActive: true }).project({ _id: 0, id: 1, name: 1, careerId: 1 }).toArray(),
      this.db.collection('curriculum_items').find().project({ _id: 0, careerId: 1, courseId: 1, versionId: 1, cycle: 1 }).toArray(),
      this.db.collection('maf_state').findOne({ key: 'concepts' }),
    ]);
    const fees = (Array.isArray(maf?.items) ? maf.items : []).filter((item: any) =>
      item && item.isActive !== false && item.active !== false && !['Inactivo', 'INACTIVO'].includes(item.status));
    return { careers, courses, versions, items, fees };
  }

  @Get('transparency')
  async transparency() {
    return this.db.collection('transparency_documents').find({ published: true })
      .project({ _id: 0, id: 1, title: 1, description: 1, code: 1, url: 1, publishedAt: 1 })
      .sort({ publishedAt: -1 }).toArray();
  }

  @Post('transparency')
  @UseGuards(StaffSessionGuard)
  async publish(@Body() body: { title?: string; description?: string; code?: string; url?: string }) {
    const title = String(body?.title || '').trim();
    const description = String(body?.description || '').trim();
    const code = String(body?.code || '').trim();
    const url = String(body?.url || '').trim();
    if (!title || title.length > 200 || description.length > 1000 || code.length > 50 || !/^https:\/\//i.test(url) || url.length > 2000)
      throw new BadRequestException('Se requiere título y enlace HTTPS válido.');
    const item = { id: `DOC-${Date.now()}`, title, description, code, url, published: true, publishedAt: new Date() };
    await this.db.collection('transparency_documents').insertOne(item);
    return item;
  }

  @Delete('transparency/:id')
  @UseGuards(StaffSessionGuard)
  async unpublish(@Param('id') id: string) {
    const result = await this.db.collection('transparency_documents').updateOne({ id }, { $set: { published: false } });
    return { unpublished: result.modifiedCount === 1 };
  }

  @Post('contact')
  async contact(@Body() body: { name?: string; email?: string; subject?: string; message?: string }) {
    const name = String(body?.name || '').trim();
    const email = String(body?.email || '').trim().toLowerCase();
    const subject = String(body?.subject || '').trim();
    const message = String(body?.message || '').trim();
    if (!name || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !subject || subject.length > 100 || !message || message.length > 4000)
      throw new BadRequestException('Revise el nombre, correo, asunto y mensaje.');
    const result = await this.db.collection('public_inquiries').insertOne({ name, email, subject, message, status: 'Pendiente', createdAt: new Date() });
    return { id: result.insertedId.toString(), status: 'Pendiente' };
  }
}
