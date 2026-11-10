import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { StaffSessionGuard } from './staff-session.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('login')
  login(@Body() body: { identifier: string; password: string }) {
    return this.usersService.login(String(body?.identifier || '').trim(), String(body?.password || ''));
  }

  @Post('activate')
  activate(@Body() body: { token: string; password: string }) {
    return this.usersService.activate(body?.token, body?.password);
  }

  @Post(':id/resend-invitation')
  @UseGuards(StaffSessionGuard)
  resendInvitation(@Param('id') id: string) { return this.usersService.resendInvitation(id); }

  @Get('me')
  @UseGuards(AuthGuard)
  async getMe(@Req() req) {
    const { uid, email, name, picture } = req.user;
    return this.usersService.findOrCreate({
      uid,
      email,
      displayName: name,
      photoURL: picture,
    });
  }

  @Get()
  @UseGuards(StaffSessionGuard)
  async getAllUsers() {
    return this.usersService.findAll();
  }

  @Post()
  @UseGuards(StaffSessionGuard)
  async createUser(@Body() createDto: CreateUserDto) {
    return this.usersService.create(createDto);
  }

  @Patch(':id')
  @UseGuards(StaffSessionGuard)
  async updateUser(@Param('id') id: string, @Body() updateDto: UpdateUserDto) {
    return this.usersService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(StaffSessionGuard)
  async deleteUser(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
