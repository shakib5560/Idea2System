import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const smtpHost = this.config.get<string>('SMTP_HOST');
    if (smtpHost) {
      const port = this.config.get<number>('SMTP_PORT', 587);
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: port,
        secure: port === 465,
        auth: {
          user: this.config.get<string>('SMTP_USER'),
          pass: this.config.get<string>('SMTP_PASS'),
        },
      });
      this.logger.log(`Nodemailer SMTP transporter initialized: ${smtpHost}:${port}`);
    }
  }

  async sendEmailVerification(email: string, otp: string, verificationUrl: string) {
    const from = this.config.get<string>('EMAIL_FROM') || 'onboarding@resend.dev';
    const resendApiKey = this.config.get<string>('RESEND_API_KEY');
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email address</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #0b0f19;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #0b0f19;
      padding: 40px 0;
    }
    .container {
      max-width: 540px;
      margin: 0 auto;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    }
    .header {
      background: linear-gradient(135deg, #1e1b4b 0%, #311042 100%);
      padding: 40px;
      text-align: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    .logo-text {
      font-size: 24px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.03em;
      text-decoration: none;
    }
    .logo-accent {
      color: #818cf8;
    }
    .content {
      padding: 40px;
      color: #94a3b8;
      line-height: 1.6;
    }
    .title {
      font-size: 22px;
      font-weight: 700;
      color: #ffffff;
      margin-top: 0;
      margin-bottom: 16px;
      letter-spacing: -0.02em;
    }
    .otp-container {
      margin: 32px auto;
      text-align: center;
    }
    .otp-code {
      display: inline-block;
      font-family: 'Courier New', Courier, monospace;
      font-size: 36px;
      font-weight: 700;
      letter-spacing: 8px;
      color: #818cf8;
      background: rgba(129, 140, 248, 0.1);
      border: 1px solid rgba(129, 140, 248, 0.3);
      padding: 16px 32px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(129, 140, 248, 0.1);
    }
    .button-container {
      margin: 24px 0;
      text-align: center;
    }
    .button {
      display: inline-block;
      background: linear-gradient(90deg, #6366f1, #a855f7);
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 28px;
      font-weight: 600;
      font-size: 14px;
      border-radius: 10px;
      box-shadow: 0 10px 20px rgba(99, 102, 241, 0.2);
    }
    .footer {
      padding: 0 40px 40px 40px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      border-top: 1px solid rgba(255, 255, 255, 0.04);
      padding-top: 24px;
    }
    .footer a {
      color: #818cf8;
      text-decoration: none;
    }
    .divider {
      height: 1px;
      background: rgba(255, 255, 255, 0.08);
      margin: 24px 0;
    }
    .meta-info {
      font-size: 13px;
      color: #64748b;
      background: rgba(255, 255, 255, 0.02);
      padding: 12px 16px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.04);
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <span class="logo-text">Idea<span class="logo-accent">2System</span></span>
      </div>
      <div class="content">
        <h1 class="title">Verify your email address</h1>
        <p>Welcome to Idea2System. Please use the following 6-digit One-Time Password (OTP) to verify your account:</p>
        
        <div class="otp-container">
          <div class="otp-code">${otp}</div>
        </div>
        
        <div class="meta-info">
          <strong>Security Note:</strong> This OTP code is valid for 15 minutes. If you did not request this registration, you can safely ignore this email.
        </div>
        
        <div class="divider"></div>
        
        <p style="font-size: 13px; text-align: center; margin-bottom: 0;">
          Or verify instantly by clicking the button below:
        </p>
        <div class="button-container">
          <a href="${verificationUrl}" class="button" target="_blank">Verify Email Address</a>
        </div>
        <p style="font-size: 11px; color: #64748b; text-align: center; margin-top: 10px;">
          Having trouble? Copy and paste the link below: <br>
          <a href="${verificationUrl}" style="color: #818cf8; word-break: break-all;" target="_blank">${verificationUrl}</a>
        </p>
      </div>
      <div class="footer">
        &copy; 2026 Idea2System. All rights reserved.<br>
        <p style="margin-top: 8px;">If you have any questions, reply to this email or contact us at <a href="mailto:support@idea2system.com">support@idea2system.com</a>.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from,
          to: email,
          subject: 'Verify your Idea2System email address',
          text: `Welcome to Idea2System. Please use the following 6-digit One-Time Password (OTP) to verify your account: ${otp}\n\nOr verify instantly by clicking this link: ${verificationUrl}`,
          html,
        });
        this.logger.log(`Verification OTP email sent to ${email} via SMTP.`);
        return;
      } catch (err: any) {
        this.logger.error(`SMTP email delivery failed: ${err.message}`, err.stack);
        throw new ServiceUnavailableException('SMTP mail delivery failed.');
      }
    }

    if (resendApiKey) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [email],
          subject: 'Verify your Idea2System email address',
          text: `Welcome to Idea2System. Please use the following 6-digit One-Time Password (OTP) to verify your account: ${otp}\n\nOr verify instantly by visiting: ${verificationUrl}`,
          html,
        }),
      });

      if (!response.ok) {
        this.logger.error(
          `Verification email failed: ${response.status} ${await response.text()}`,
        );
        throw new ServiceUnavailableException(
          'Unable to send verification email.',
        );
      }
      this.logger.log(`Verification OTP email sent to ${email} via Resend.`);
      return;
    }

    if (this.config.get<string>('NODE_ENV') !== 'production') {
      this.logger.log(
        `Email verification OTP for ${email}: ${otp} (Link: ${verificationUrl})`,
      );
      return;
    }

    throw new ServiceUnavailableException(
      'Email delivery is not configured. Set SMTP_HOST or RESEND_API_KEY.',
    );
  }
}
