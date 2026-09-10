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
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pre-inscripción Exitosa - IESTP San Francisco de Asís</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f4f5f7; color: #333333;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f5f7; padding: 20px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); max-width: 600px; width: 100%;">
          <tr>
            <td style="background-color: #8b0020; padding: 25px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: bold; letter-spacing: 0.5px; text-transform: uppercase;">
                IESTP SAN FRANCISCO DE ASÍS
              </h1>
              <p style="color: #e0e0e0; margin: 6px 0 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">
                Proceso de Admisión Institucional
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 25px;">
              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #444444;">
                Estimado(a) <strong>${studentName}</strong>, queremos confirmarle que se ha completado correctamente su pre-inscripción en la base de datos de control académico para la carrera de <strong>${careerName}</strong>. Bienvenido(a) al proceso de selección de nuestra prestigiosa institución.
              </p>
              <div style="background-color: #fff0f2; border: 1px solid #fcd3d7; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                <h3 style="color: #8b0020; margin: 0 0 15px 0; font-size: 15px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">
                  SUS CREDENCIALES DE ADMISIÓN
                </h3>
                <p style="margin: 6px 0; font-size: 14px; color: #333333;">
                  <strong>Correo Registrado:</strong> <span style="color: #0056b3;">${data.email}</span>
                </p>
                <p style="margin: 6px 0; font-size: 14px; color: #333333;">
                  <strong>Código de Postulante:</strong> <span style="background-color: #ffffff; padding: 2px 6px; border-radius: 4px; border: 1px solid #f5c2c7; color: #8b0020; font-weight: bold;">${code}</span>
                </p>
                <p style="margin: 6px 0; font-size: 14px; color: #333333;">
                  <strong>Contraseña Temporal:</strong> <span style="background-color: #ffffff; padding: 2px 6px; border-radius: 4px; border: 1px solid #f5c2c7; color: #8b0020; font-weight: bold;">${pass}</span>
                </p>
              </div>
              <div style="text-align: center; margin: 25px 0;">
                <a href="http://localhost:3000/ingresar" target="_blank" style="background-color: #990024; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-size: 15px; font-weight: bold; display: inline-block; box-shadow: 0 2px 5px rgba(153, 0, 36, 0.3);">
                  INGRESAR A LA INTRANET
                </a>
              </div>
              <hr style="border: none; border-top: 1px solid #eeeeee; margin: 25px 0;">
              <h4 style="margin: 0 0 12px 0; font-size: 15px; color: #333333;">
                📋 Próximos pasos a seguir para completar su admisión:
              </h4>
              <ol style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6; color: #555555;">
                <li style="margin-bottom: 8px;">
                  <strong>Acceder con sus credenciales:</strong> Haga clic en el botón superior o use su Código de Postulante/DNI junto a su clave temporal en el cuadro correspondiente de la Intranet.
                </li>
                <li style="margin-bottom: 8px;">
                  <strong>Carga de Documentos:</strong> Complete su expediente digital cargando copias legibles de su DNI, Certificado de Estudios Original, Certificado de Partida de Nacimiento y Foto de postulante.
                </li>
                <li style="margin-bottom: 8px;">
                  <strong>Registro de Pago:</strong> Ingrese el número de operación bancaria de pago de su expediente en la pestaña de tasas de postulación.
                </li>
                <li style="margin-bottom: 8px;">
                  <strong>Control y Examen:</strong> Monitoree el estado de aprobación de su carpeta académica para recibir su fecha y hora oficial del examen de admisión.
                </li>
              </ol>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 15px 20px; text-align: center; font-size: 12px; color: #888888;">
              © IESTP San Francisco de Asís - Sistema de Admisión Institucional.<br>
              Este es un mensaje automático de control académico, por favor no responda a este correo.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const payload: any = {
      to: [
        {
          email: data.email,
          name: studentName,
        },
      ],
      subject: `¡Bienvenido! Credenciales de Admisión - IESTP San Francisco de Asís`,
      htmlContent,
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
