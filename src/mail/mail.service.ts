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

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="background-color: #9F062A; color: #ffffff; padding: 28px 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase;">IESTP SAN FRANCISCO DE ASÍS</h1>
          <p style="margin: 6px 0 0 0; font-size: 11px; color: #fecdd3; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Proceso de Admisión Institucional 2026</p>
        </div>
        
        <div style="padding: 28px 24px; color: #334155; font-size: 14px; line-height: 1.7; background-color: #ffffff;">
          <p style="margin-top: 0; font-size: 15px;">Estimado(a) <strong style="color: #0f172a;">${studentName}</strong>,</p>
          <p>Queremos confirmarle que se ha completado correctamente su pre-inscripción en la carrera técnica de <strong style="color: #9F062A;">${careerName}</strong> en la base de datos de control académico. Bienvenido(a) al proceso de selección de nuestra prestigiosa institución.</p>
          
          <div style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 10px; padding: 18px; margin: 24px 0;">
            <h3 style="margin: 0 0 14px 0; color: #9F062A; font-size: 12px; text-transform: uppercase; font-weight: 900; text-align: center; letter-spacing: 1px;">Sus Credenciales de Admisión</h3>
            <p style="margin: 6px 0; font-size: 13px;"><strong>Correo Registrado:</strong> ${data.email}</p>
            ${data.dni ? `<p style="margin: 6px 0; font-size: 13px;"><strong>DNI / Usuario:</strong> ${data.dni}</p>` : ''}
            <p style="margin: 6px 0; font-size: 13px;"><strong>Código de Postulante:</strong> <span style="background: #ffffff; border: 1px solid #fecdd3; padding: 2px 8px; border-radius: 4px; font-family: monospace; font-weight: 900; color: #9F062A;">${code}</span></p>
            <p style="margin: 6px 0; font-size: 13px;"><strong>Contraseña Temporal:</strong> <span style="background: #ffffff; border: 1px solid #fecdd3; padding: 2px 8px; border-radius: 4px; font-family: monospace; font-weight: 900; color: #9F062A;">${pass}</span></p>
          </div>

          <div style="text-align: center; margin-top: 28px;">
            <a href="http://localhost:3000/ingresar" style="background-color: #9F062A; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 900; font-size: 12px; text-transform: uppercase; display: inline-block; letter-spacing: 1px;">Ingresar a la Intranet</a>
          </div>
        </div>

        <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #64748b; border-t: 1px solid #e2e8f0;">
          © 2026 IESTP San Francisco de Asís • Villa María del Triunfo, Lima, Perú
        </div>
      </div>
    `;

    const senderEmail = this.configService.get<string>('BREVO_SENDER_EMAIL') || 'enviador-de-registro@sfa.edu.pe';
    const senderName = this.configService.get<string>('BREVO_SENDER_NAME') || 'IESTP San Francisco de Asís';

    const payload: any = {
      sender: {
        name: senderName,
        email: senderEmail,
      },
      to: [
        {
          email: data.email,
          name: studentName,
        },
      ],
      templateId,
      subject: `📥 [IESTP SFA] Credenciales de Admisión - ${studentName}`,
      htmlContent,
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
