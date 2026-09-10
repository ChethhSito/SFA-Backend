import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export class SendWelcomeEmailDto {
  email: string;
  name: string;
  applicantCode?: string;
  dni?: string;
  programName?: string;
  temporaryPassword?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {}

  async sendWelcomeEmail(data: SendWelcomeEmailDto): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const apiKey = this.configService.get<string>('BREVO_API_KEY');
    const rawTemplateId = this.configService.get<string>('BREVO_TEMPLATE_ID') || '5';
    const templateId = parseInt(rawTemplateId, 10);

    if (!apiKey) {
      this.logger.warn('⚠️ BREVO_API_KEY no configurada. El correo no se enviará de forma real.');
      return { success: false, error: 'BREVO_API_KEY missing' };
    }

    const studentName = data.name || 'Postulante';
    const careerName = data.programName || 'Programa Técnico Profesional';
    const code = data.applicantCode || data.dni || '202610001';
    const pass = data.temporaryPassword || 'clave123';

    const payload: any = {
      to: [
        {
          email: data.email,
          name: studentName,
        },
      ],
      templateId,
      params: {
        email: data.email,
        applicantCode: code,
        password: pass,
        url: 'http://localhost:3000/ingresar',
        NOMBRE: studentName,
        nombre: studentName,
        Name: studentName,
        CODIGO: code,
        codigo: code,
        DNI: data.dni || '',
        dni: data.dni || '',
        CARRERA: careerName,
        carrera: careerName,
        program: careerName,
        PASSWORD: pass,
        clave: pass,
        LOGIN_URL: 'http://localhost:3000/ingresar',
      },
    };

    const senderEmail = this.configService.get<string>('BREVO_SENDER_EMAIL');
    const senderName = this.configService.get<string>('BREVO_SENDER_NAME') || 'IESTP San Francisco de Asís';

    if (senderEmail) {
      payload.sender = {
        name: senderName,
        email: senderEmail,
      };
    }

    try {
      this.logger.log(`Enviando correo transaccional real a ${data.email} con plantilla Brevo #${templateId}...`);

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const resData = await response.json();

      if (response.ok) {
        this.logger.log(`✅ Correo enviado exitosamente via Brevo API. ID: ${resData.messageId}`);
        return { success: true, messageId: resData.messageId };
      } else {
        this.logger.error(`❌ Error respuesta Brevo API (${response.status}): ${JSON.stringify(resData)}`);
        return { success: false, error: resData.message || JSON.stringify(resData) };
      }
    } catch (err: any) {
      this.logger.error(`❌ Excepción enviando correo via Brevo: ${err.message}`);
      return { success: false, error: err.message };
    }
  }
}
