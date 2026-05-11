import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {

    private transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS,
        },
    });

    async sendResetPassword(email: string, token: string) {

        const resetLink = `http://localhost:5173/reset-password?token=${token}`;

        await this.transporter.sendMail({
            from: `"Control Finanzas" <${process.env.MAIL_USER}>`,
            to: email,
            subject: 'Restablecer contraseña',
            html: `
        <h2>Recuperación de contraseña</h2>
        <p>Haz clic en el enlace para cambiar tu contraseña:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>Este enlace expira en 15 minutos.</p>
      `,
        });
    }
}