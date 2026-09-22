import { Controller, Post, Body } from '@nestjs/common';
import { MailService, SendWelcomeEmailDto } from './mail.service';

@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('send-welcome')
  async sendWelcome(@Body() dto: SendWelcomeEmailDto) {
    return this.mailService.sendWelcomeEmail(dto);
  }
}
