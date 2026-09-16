import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsString, IsNotEmpty, IsOptional, IsEmail } from 'class-validator';

export class SendWelcomeEmailDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  applicantCode?: string;

  @IsString()
  @IsOptional()
  dni?: string;

  @IsString()
  @IsOptional()
  programName?: string;

  @IsString()
  @IsOptional()
  temporaryPassword?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  url?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {}

  async sendWelcomeEmail(data: SendWelcomeEmailDto): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!data || !data.email || !data.email.trim()) {
      this.logger.debug('ℹ️ Solicitud recibida sin dirección de correo electrónico. Se omite el envío transaccional.');
      return { success: false, error: 'Dirección de correo electrónico requerida.' };
    }

    const recipientEmail = data.email.trim();
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
    const pass = data.temporaryPassword || (data as any).password || 'clave123';

    const logoUrlConfig = this.configService.get<string>('BREVO_LOGO_URL') || 
                          this.configService.get<string>('APP_LOGO_URL') ||
                          (data as any).logoUrl;

    let logoHtml = '';
    if (logoUrlConfig && logoUrlConfig.trim()) {
      logoHtml = `
        <div style="margin-bottom: 14px; text-align: center;">
          <img src="${logoUrlConfig.trim()}" alt="Logo IESTP San Francisco de Asís" width="76" height="76" style="width: 76px; height: 76px; border-radius: 50%; border: 3px solid rgba(255, 255, 255, 0.95); box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2); object-fit: cover; display: inline-block;" />
        </div>
      `;
    } else {
      // Institutional Academic Emblem (Vector HTML/CSS - 0 attachments, 100% clean)
      logoHtml = `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto 16px auto;">
          <tr>
            <td align="center" valign="middle" style="width: 74px; height: 74px; border-radius: 50%; background-color: #5c0015; border: 3px double #f59e0b; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
              <div style="font-family: 'Georgia', 'Times New Roman', serif; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: 2.5px; line-height: 74px;">
                SFA
              </div>
            </td>
          </tr>
        </table>
      `;
    }

    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmación de Admisión - IESTP San Francisco de Asís</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; padding: 40px 15px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);">
          
          <!-- Institutional Header -->
          <tr>
            <td style="background-color: #8b0020; padding: 36px 30px; text-align: center; background-image: linear-gradient(180deg, #8b0020 0%, #700019 100%);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    ${logoHtml}
                    <h1 style="color: #ffffff; margin: 0; font-size: 21px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; font-family: 'Inter', -apple-system, Roboto, sans-serif;">
                      IESTP SAN FRANCISCO DE ASÍS
                    </h1>
                    <p style="color: #fecaca; margin: 8px 0 0 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; opacity: 0.95;">
                      PROCESO DE ADMISIÓN INSTITUCIONAL
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 36px 32px 28px 32px;">
              
              <!-- Welcome Greeting -->
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.65; color: #334155;">
                Estimado(a) <strong style="color: #0f172a;">${studentName}</strong>, queremos confirmarle que se ha completado correctamente su pre-inscripción en la base de datos de control académico para la carrera de <strong style="color: #8b0020;">${careerName}</strong>. Bienvenido(a) al proceso de selección de nuestra prestigiosa institución.
              </p>

              <!-- Credentials Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 28px; background-color: #fcfcfd; border: 1px solid #e2e8f0; border-left: 4px solid #8b0020; border-radius: 8px;">
                <tr>
                  <td style="padding: 20px 22px;">
                    <div style="color: #8b0020; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 14px;">
                      SUS CREDENCIALES DE ADMISIÓN
                    </div>
                    
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding: 6px 0; font-size: 14px; color: #475569; width: 140px;">
                          <strong>Correo Registrado:</strong>
                        </td>
                        <td style="padding: 6px 0; font-size: 14px; color: #0284c7; font-weight: 600;">
                          ${data.email}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 14px; color: #475569;">
                          <strong>Código de Postulante:</strong>
                        </td>
                        <td style="padding: 6px 0;">
                          <span style="display: inline-block; background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 3px 10px; color: #8b0020; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 13px; font-weight: 700; letter-spacing: 0.5px;">
                            ${code}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 14px; color: #475569;">
                          <strong>Contraseña Temporal:</strong>
                        </td>
                        <td style="padding: 6px 0;">
                          <span style="display: inline-block; background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 3px 10px; color: #8b0020; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 13px; font-weight: 700; letter-spacing: 0.5px;">
                            ${pass}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Main Action CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 32px 0;">
                <tr>
                  <td align="center">
                    <a href="${data.url || 'http://localhost:3000/ingresar'}" target="_blank" style="background-color: #8b0020; color: #ffffff; text-decoration: none; padding: 15px 36px; border-radius: 8px; font-size: 15px; font-weight: 700; display: inline-block; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(139, 0, 32, 0.25);">
                      INGRESAR A LA INTRANET
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <div style="border-top: 1px solid #e2e8f0; margin: 32px 0 28px 0;"></div>

              <!-- Next Steps Title -->
              <h3 style="margin: 0 0 20px 0; font-size: 16px; font-weight: 700; color: #0f172a; letter-spacing: -0.2px;">
                Próximos pasos a seguir para completar su admisión:
              </h3>

              <!-- 4 Steps Section -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <!-- Step 1 -->
                <tr>
                  <td style="padding-bottom: 16px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 8px; padding: 14px 16px;">
                      <tr>
                        <td width="36" valign="top" style="padding-right: 12px;">
                          <div style="background-color: #8b0020; color: #ffffff; width: 28px; height: 28px; border-radius: 50%; text-align: center; line-height: 28px; font-size: 13px; font-weight: 700;">
                            1
                          </div>
                        </td>
                        <td valign="top">
                          <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 3px;">
                            Acceder a la intranet
                          </div>
                          <div style="font-size: 13px; color: #64748b; line-height: 1.5;">
                            Haga clic en el botón superior o use su Código de Postulante/DNI junto a su clave temporal en el cuadro correspondiente de la Intranet.
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Step 2 -->
                <tr>
                  <td style="padding-bottom: 16px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 8px; padding: 14px 16px;">
                      <tr>
                        <td width="36" valign="top" style="padding-right: 12px;">
                          <div style="background-color: #8b0020; color: #ffffff; width: 28px; height: 28px; border-radius: 50%; text-align: center; line-height: 28px; font-size: 13px; font-weight: 700;">
                            2
                          </div>
                        </td>
                        <td valign="top">
                          <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 3px;">
                            Carga de documentos
                          </div>
                          <div style="font-size: 13px; color: #64748b; line-height: 1.5;">
                            Complete su expediente digital cargando copias legibles de su DNI, Certificado de Estudios Original, Certificado de Partida de Nacimiento y Foto de postulante.
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Step 3 -->
                <tr>
                  <td style="padding-bottom: 16px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 8px; padding: 14px 16px;">
                      <tr>
                        <td width="36" valign="top" style="padding-right: 12px;">
                          <div style="background-color: #8b0020; color: #ffffff; width: 28px; height: 28px; border-radius: 50%; text-align: center; line-height: 28px; font-size: 13px; font-weight: 700;">
                            3
                          </div>
                        </td>
                        <td valign="top">
                          <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 3px;">
                            Registro de pago
                          </div>
                          <div style="font-size: 13px; color: #64748b; line-height: 1.5;">
                            Ingrese el número de operación bancaria de pago de su expediente en la pestaña de tasas de postulación.
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Step 4 -->
                <tr>
                  <td>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 8px; padding: 14px 16px;">
                      <tr>
                        <td width="36" valign="top" style="padding-right: 12px;">
                          <div style="background-color: #8b0020; color: #ffffff; width: 28px; height: 28px; border-radius: 50%; text-align: center; line-height: 28px; font-size: 13px; font-weight: 700;">
                            4
                          </div>
                        </td>
                        <td valign="top">
                          <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 3px;">
                            Control y examen
                          </div>
                          <div style="font-size: 13px; color: #64748b; line-height: 1.5;">
                            Monitoree el estado de aprobación de su carpeta académica para recibir su fecha y hora oficial del examen de admisión.
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #64748b;">
                © IESTP San Francisco de Asís - Sistema de Admisión Institucional.
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                Este es un mensaje automático de control académico, por favor no responda a este correo.
              </p>
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
          email: recipientEmail,
          name: studentName,
        },
      ],
      subject: `¡Bienvenido! Credenciales de Admisión - IESTP San Francisco de Asís`,
      htmlContent,
    };

    const senderEmail = this.configService.get<string>('BREVO_SENDER_EMAIL') || 'raulquintanazinc@gmail.com';
    const senderName = this.configService.get<string>('BREVO_SENDER_NAME') || 'IESTP San Francisco de Asís';

    payload.sender = {
      name: senderName,
      email: senderEmail,
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
