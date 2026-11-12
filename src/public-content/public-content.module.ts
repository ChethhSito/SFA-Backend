import { Module } from '@nestjs/common';
import { PublicContentController } from './public-content.controller';
import { UsersModule } from '../users/users.module';

@Module({ imports: [UsersModule], controllers: [PublicContentController] })
export class PublicContentModule {}
