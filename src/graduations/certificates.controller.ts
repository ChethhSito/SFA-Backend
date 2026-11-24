import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { CertificatesService } from './certificates.service';
import type { CertificateInput } from './certificates.service';

@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificates: CertificatesService) {}

  @Get()
  list() {
    return this.certificates.list();
  }

  @Get('student/:dni')
  student(@Param('dni') dni: string) {
    return this.certificates.listForStudent(dni);
  }

  @Post()
  register(@Body() body: CertificateInput, @Req() request: any) {
    const actor = request?.user?.uid || 'mge_secretaria';
    return this.certificates.register(body, actor);
  }

  @Get(':id/file')
  file(@Param('id') id: string) {
    return this.certificates.getFile(id);
  }

  @Patch(':id/revoke')
  revoke(@Param('id') id: string, @Body() body: { reason: string }, @Req() request: any) {
    const actor = request?.user?.uid || 'mge_secretaria';
    return this.certificates.revoke(id, body.reason, actor);
  }
}

@Controller('certificate-verification')
export class CertificateVerificationController {
  constructor(private readonly certificates: CertificatesService) {}
  @Get(':code') verify(@Param('code') code: string) { return this.certificates.verify(code); }
}
