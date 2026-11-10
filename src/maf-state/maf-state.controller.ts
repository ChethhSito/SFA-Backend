import { BadRequestException, Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { MafSessionGuard } from '../users/staff-session.guard';

const allowed = new Set(['concepts', 'obligations', 'auditLogs']);

@Controller('maf-state')
export class MafStateController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  private collection(key: string) {
    if (!allowed.has(key)) throw new BadRequestException('Colección MAF inválida.');
    return this.connection.collection('maf_state');
  }

  @Get(':key')
  @UseGuards(MafSessionGuard)
  async read(@Param('key') key: string) {
    const record = await this.collection(key).findOne({ key });
    return { items: record?.items || [] };
  }

  @Put(':key')
  @UseGuards(MafSessionGuard)
  async save(@Param('key') key: string, @Body() body: { items?: unknown[] }) {
    if (!Array.isArray(body?.items) || body.items.length > 20000 || JSON.stringify(body.items).length > 4_000_000)
      throw new BadRequestException('Datos MAF inválidos o demasiado extensos.');
    await this.collection(key).updateOne({ key }, { $set: { key, items: body.items, updatedAt: new Date() } }, { upsert: true });
    return { saved: body.items.length };
  }
}
