import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(AuthGuard)
  async getMe(@Req() req) {
    // req.user is attached by AuthGuard from the verified JWT token
    const { uid, email, name, picture } = req.user;
    return this.usersService.findOrCreate({
      uid,
      email,
      displayName: name,
      photoURL: picture,
    });
  }

  @Get()
  @UseGuards(AuthGuard)
  async getAllUsers() {
    return this.usersService.findAll();
  }
}
