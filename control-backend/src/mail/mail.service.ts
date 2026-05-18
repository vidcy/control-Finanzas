import { Injectable } from '@nestjs/common';
import sgMail from '@sendgrid/mail';

@Injectable()
export class MailService {
  constructor() {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
  }

  async sendResetPassword(email: string, token: string) {
    const resetLink = `${process.env.FRONT_URL}/reset-password?token=${token}`;

    const msg = {
      to: email,
      from: {
        email: process.env.SENDGRID_MAIL!, // 👈 AQUÍ estaba el error
        name: 'Control Finanzas',
      },
      subject: 'Restablecer contraseña',
      html: `
        <h2>Recuperación de contraseña</h2>
        <p>Haz clic en el enlace para cambiar tu contraseña:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>Este enlace expira en 15 minutos.</p>
      `,
    };

    await sgMail.send(msg);
  }
}
