import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CertificateManagementGuard } from './certificate-management.guard';
import { CertificatesService } from './certificates.service';
import type { CertificateInput } from './certificates.service';

@Controller('certificates')
@UseGuards(AuthGuard, CertificateManagementGuard)
export class CertificatesController {
  constructor(private readonly certificates: CertificatesService) {}
  @Get() list() { return this.certificates.list(); }
  @Get('student/:dni') student(@Param('dni') dni: string) { return this.certificates.listForStudent(dni); }
  @Post() register(@Body() body: CertificateInput, @Req() request: { user: { uid: string } }) { return this.certificates.register(body, request.user.uid); }
  @Get(':id/file') file(@Param('id') id: string) { return this.certificates.getFile(id); }
  @Patch(':id/revoke') revoke(@Param('id') id: string, @Body() body: { reason: string }, @Req() request: { user: { uid: string } }) {
    return this.certificates.revoke(id, body.reason, request.user.uid);
  }
}

@Controller('certificate-verification')
export class CertificateVerificationController {
  constructor(private readonly certificates: CertificatesService) {}
  @Get(':code') verify(@Param('code') code: string) { return this.certificates.verify(code); }
}
