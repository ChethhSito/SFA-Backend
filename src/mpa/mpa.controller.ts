import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { SaveMpaItemsDto } from './dto/save-mpa-items.dto';
import { MpaService } from './mpa.service';

@Controller('mpa')
export class MpaController {
  constructor(private readonly service: MpaService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Get(':kind') findOne(@Param('kind') kind: string) { return this.service.findOne(kind); }
  @Put(':kind') save(@Param('kind') kind: string, @Body() dto: SaveMpaItemsDto) { return this.service.save(kind, dto.items); }
}
