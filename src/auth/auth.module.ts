import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [AuthService, AuthGuard, RolesGuard],
  exports: [AuthService, AuthGuard, RolesGuard],
})
export class AuthModule {}

