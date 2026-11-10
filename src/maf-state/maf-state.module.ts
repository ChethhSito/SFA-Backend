import { Module } from '@nestjs/common';
import { MafStateController } from './maf-state.controller';
import { UsersModule } from '../users/users.module';

@Module({ imports: [UsersModule], controllers: [MafStateController] })
export class MafStateModule {}
