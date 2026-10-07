import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly transporter;

  constructor() {
    this.transporter =
      nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(
          process.env.SMTP_PORT,
        ),
        secure: false,

        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
  }

  async sendOtpEmail(
    email: string,
    name: string,
    otp: string,
  ) {
    await this.transporter.sendMail({
      from: `"Nexora" <${process.env.SENDER_EMAIL}>`,
      to: email,

      subject:
        'Your Nexora Verification Code',

      text: `Hello ${name},

Your Nexora verification code is:

${otp}

This OTP will expire in 10 minutes.

If you did not create a Nexora account, please ignore this email.

Regards,
Nexora Team`,

      html: `
        <div style="
          font-family: Arial, sans-serif;
          max-width: 600px;
          margin: 0 auto;
          padding: 30px;
          background: #f8f9fa;
        ">
          <div style="
            background: white;
            padding: 30px;
            border-radius: 10px;
          ">

            <h2 style="
              margin-bottom: 10px;
            ">
              Welcome to Nexora
            </h2>

            <p>
              Hello ${name},
            </p>

            <p>
              Use the verification code below
              to verify your email address:
            </p>

            <div style="
              font-size: 32px;
              font-weight: bold;
              letter-spacing: 8px;
              text-align: center;
              padding: 20px;
              margin: 25px 0;
              background: #f1f5f9;
              border-radius: 8px;
            ">
              ${otp}
            </div>

            <p>
              This code will expire in
              <strong>10 minutes</strong>.
            </p>

            <p>
              If you did not create a Nexora
              account, you can safely ignore
              this email.
            </p>

            <p>
              Regards,<br />
              <strong>Nexora Team</strong>
            </p>

          </div>
        </div>
      `,
    });
  }
}