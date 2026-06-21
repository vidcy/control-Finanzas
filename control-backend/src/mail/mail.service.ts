import { Injectable } from '@nestjs/common';
import fetch from 'node-fetch';

@Injectable()
export class MailService {
  private async sendMail(to: string, subject: string, html: string) {
    // 1. SendGrid integration
    if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_MAIL) {
      console.log('Sending email via SendGrid to:', to);
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: {
            email: process.env.SENDGRID_MAIL,
            name: 'Think - Global Ccoplex',
          },
          subject: subject,
          content: [{ type: 'text/html', value: html }],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('SendGrid API error:', errText);
        throw new Error(`SendGrid mail delivery failed: ${response.statusText}`);
      }
      return { success: true };
    }

    // 2. SMTP2GO integration fallback
    if (process.env.SMTP2GO_API_KEY && process.env.SMTP2GO_SENDER) {
      console.log('Sending email via SMTP2GO to:', to);
      const response = await fetch('https://api.smtp2go.com/v3/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: process.env.SMTP2GO_API_KEY,
          to: [to],
          sender: process.env.SMTP2GO_SENDER,
          subject: subject,
          html_body: html,
        }),
      });

      const data: any = await response.json();
      if (!data?.data?.succeeded) {
        console.error('SMTP2GO error:', data);
        throw new Error('SMTP2GO mail delivery failed');
      }
      return data;
    }

    console.warn('No mail provider configured (SendGrid or SMTP2GO). Email not sent.');
    return { skipped: true };
  }

  async sendResetPassword(email: string, token: string) {
    const resetLink = `${process.env.FRONT_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #6366f1; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 1px;">THINK</h1>
          <p style="text-transform: uppercase; font-size: 10px; letter-spacing: 2px; color: #6366f1; font-weight: 700; margin: 5px 0 0 0;">Plataforma Financiera</p>
        </div>
        <div style="background-color: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <h2 style="color: #1e293b; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 16px;">Recuperación de contraseña</h2>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
            Has solicitado restablecer tu contraseña. Haz clic en el siguiente botón para continuar:
          </p>
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${resetLink}" style="display: inline-block; padding: 14px 30px; background-color: #6366f1; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; border-radius: 8px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);">
              Restablecer Contraseña
            </a>
          </div>
          <p style="color: #94a3b8; font-size: 11px; line-height: 1.5; text-align: center; margin: 0;">
            Si el botón no funciona, copia y pega este enlace en tu navegador:<br/>
            <a href="${resetLink}" style="color: #6366f1; word-break: break-all;">${resetLink}</a>
          </p>
          <p style="color: #475569; font-size: 12px; margin-top: 20px; text-align: center;">
            Este enlace expira en 15 minutos.
          </p>
        </div>
        <div style="text-align: center; margin-top: 24px; color: #94a3b8; font-size: 11px;">
          <p style="margin: 0 0 4px 0;"><strong>Global Ccoplex</strong></p>
          <p style="margin: 0;">&copy; Todos los derechos reservados.</p>
        </div>
      </div>
    `;

    return this.sendMail(email, 'Restablecer contraseña - Think', html);
  }

  async sendActivationEmail(email: string, token: string) {
    const activationLink = `${process.env.FRONT_URL || 'http://localhost:5173'}/login?activate_token=${token}`;

    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #6366f1; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 1px;">THINK</h1>
          <p style="text-transform: uppercase; font-size: 10px; letter-spacing: 2px; color: #6366f1; font-weight: 700; margin: 5px 0 0 0;">Plataforma Financiera</p>
        </div>
        <div style="background-color: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <h2 style="color: #1e293b; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 16px;">¡Bienvenido a Think!</h2>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
            Gracias por registrarte en nuestra plataforma financiera. Para garantizar la seguridad de tu cuenta, por favor actívala haciendo clic en el siguiente botón:
          </p>
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${activationLink}" style="display: inline-block; padding: 14px 30px; background-color: #6366f1; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; border-radius: 8px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);">
              Activar Cuenta
            </a>
          </div>
          <p style="color: #94a3b8; font-size: 11px; line-height: 1.5; text-align: center; margin: 0;">
            Si el botón no funciona, copia y pega este enlace en tu navegador:<br/>
            <a href="${activationLink}" style="color: #6366f1; word-break: break-all;">${activationLink}</a>
          </p>
          <p style="color: #475569; font-size: 12px; margin-top: 20px; text-align: center;">
            Este enlace de activación expira en 24 horas.
          </p>
        </div>
        <div style="text-align: center; margin-top: 24px; color: #94a3b8; font-size: 11px;">
          <p style="margin: 0 0 4px 0;"><strong>Global Ccoplex</strong></p>
          <p style="margin: 0;">&copy; Todos los derechos reservados.</p>
        </div>
      </div>
    `;

    return this.sendMail(email, 'Activa tu cuenta de Think', html);
  }
}
