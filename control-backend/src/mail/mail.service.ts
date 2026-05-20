import { Injectable } from '@nestjs/common';

@Injectable()
export class MailService {
  private readonly apiKey = process.env.SMTP2GO_API_KEY!;
  private readonly sender = process.env.SMTP2GO_SENDER!;
  // ejemplo: noreply@tudominio.com

  async sendResetPassword(email: string, token: string) {
    const resetLink = `${process.env.FRONT_URL}/reset-password?token=${token}`;

    const response = await fetch('https://api.smtp2go.com/v3/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: this.apiKey,
        to: [email],
        sender: this.sender,
        subject: 'Restablecer contraseña',
        html_body: `
          <h2>Recuperación de contraseña</h2>
          <p>Haz clic en el enlace para cambiar tu contraseña:</p>
          <a href="${resetLink}">${resetLink}</a>
          <p>Este enlace expira en 15 minutos.</p>
        `,
      }),
    });

    const data: any = await response.json();

    if (!data?.data?.succeeded) {
      console.error('SMTP2GO error:', data);
      throw new Error('Error enviando correo');
    }

    return data;
  }
}
