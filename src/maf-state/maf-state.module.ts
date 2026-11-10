import { Module } from '@nestjs/common';
import { MafStateController } from './maf-state.controller';

@Module({ controllers: [MafStateController] })
export class MafStateModule {}
