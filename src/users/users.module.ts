import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User, UserSchema } from './schemas/user.schema';
import { MailModule } from '../mail/mail.module';
import { MafSessionGuard, SecretariaSessionGuard, StaffSessionGuard } from './staff-session.guard';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    MailModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, StaffSessionGuard, MafSessionGuard, SecretariaSessionGuard],
  exports: [UsersService, StaffSessionGuard, MafSessionGuard, SecretariaSessionGuard],
})
export class UsersModule {}
