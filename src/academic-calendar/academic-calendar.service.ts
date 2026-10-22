import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AcademicPeriod } from '../mpa/schemas/academic-planning.schemas';
import { AcademicCalendar, CalendarEvent } from './academic-calendar.schema';

type CalendarEventInput = Pick<CalendarEvent, 'id' | 'date' | 'type' | 'title' | 'description'>;

@Injectable()
export class AcademicCalendarService {
  constructor(
    @InjectModel(AcademicCalendar.name) private readonly calendars: Model<AcademicCalendar>,
    @InjectModel(AcademicPeriod.name) private readonly periods: Model<AcademicPeriod>,
  ) {}

  private async getPeriod(periodId: string) {
    const period = await this.periods.findOne({ id: periodId }).lean().exec();
    if (!period) throw new NotFoundException('Período académico no encontrado.');
    return period;
  }

  async get(periodId: string) {
    await this.getPeriod(periodId);
    const calendar = await this.calendars.findOne({ periodId }).lean().exec();
    return {
      periodId,
      events: calendar?.events || [],
      hasImage: !!calendar?.imageMime,
      imageFileName: calendar?.imageFileName || null,
      imageUpdatedAt: calendar?.imageUpdatedAt || null,
    };
  }

  async saveEvents(periodId: string, events: CalendarEventInput[]) {
    const period = await this.getPeriod(periodId);
    if (!Array.isArray(events) || events.length > 200) throw new BadRequestException('El calendario admite hasta 200 anuncios.');
    const seen = new Set<string>();
    const cleaned = events.map((event) => {
      if (!event || typeof event !== 'object') throw new BadRequestException('Evento inválido.');
      const id = typeof event.id === 'string' ? event.id.trim() : '';
      const date = event.date;
      const title = typeof event.title === 'string' ? event.title.trim() : '';
      const description = typeof event.description === 'string' ? event.description.trim() : '';
      if (!id || id.length > 100 || seen.has(id) || !this.validDate(date) || date < period.startDate || date > period.endDate ||
          !['Feriado', 'Actividad', 'Aviso'].includes(event.type) || !title || title.length > 120 || description.length > 600) {
        throw new BadRequestException('Revise identificador, fecha, tipo, título y descripción de los anuncios. La fecha debe estar dentro del período.');
      }
      seen.add(id);
      return { id, date, type: event.type, title, description };
    }).sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
    await this.calendars.updateOne({ periodId }, { $set: { events: cleaned }, $setOnInsert: { periodId } }, { upsert: true }).exec();
    return this.get(periodId);
  }

  async saveImage(periodId: string, input: { fileName: string; mimeType: string; contentBase64: string }) {
    await this.getPeriod(periodId);
    if (!input || typeof input.fileName !== 'string' || !input.fileName.trim() || input.fileName.length > 180 ||
        typeof input.contentBase64 !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(input.contentBase64)) {
      throw new BadRequestException('Adjunte una imagen válida.');
    }
    const data = Buffer.from(input.contentBase64, 'base64');
    if (!data.length || data.length > 5 * 1024 * 1024) throw new BadRequestException('La imagen debe pesar como máximo 5 MB.');
    const mime = this.detectImageMime(data);
    if (!mime || mime !== input.mimeType) throw new BadRequestException('Solo se admiten imágenes PNG, JPEG o WebP válidas.');
    await this.calendars.updateOne({ periodId }, { $set: {
      imageData: data, imageMime: mime, imageFileName: input.fileName.trim(), imageUpdatedAt: new Date(),
    }, $setOnInsert: { periodId } }, { upsert: true }).exec();
    return this.get(periodId);
  }

  async getImage(periodId: string) {
    const calendar = await this.calendars.findOne({ periodId }).select('+imageData').exec();
    if (!calendar?.imageData || !calendar.imageMime) throw new NotFoundException('El período no tiene una imagen de calendario publicada.');
    return { data: calendar.imageData, mimeType: calendar.imageMime };
  }

  async deleteImage(periodId: string) {
    await this.getPeriod(periodId);
    await this.calendars.updateOne({ periodId }, { $unset: {
      imageData: '', imageMime: '', imageFileName: '', imageUpdatedAt: '',
    } }).exec();
    return this.get(periodId);
  }

  private validDate(value: unknown): value is string {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }

  private detectImageMime(data: Buffer): string | null {
    if (data.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) return 'image/png';
    if (data.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'))) return 'image/jpeg';
    if (data.subarray(0, 4).toString() === 'RIFF' && data.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
    return null;
  }
}
