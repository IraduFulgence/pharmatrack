import { Injectable, Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter;

  constructor() {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for 587
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  /**
   * Send a password reset email with a secure link
   */
  async sendPasswordResetEmail(
    to: string,
    recipientName: string,
    resetToken: string,
  ): Promise<boolean> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;
    const mailFrom = process.env.MAIL_FROM || `"Pharmatrack" <${process.env.SMTP_USER || 'no-reply@pharmatrack.com'}>`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 24px; color: #1f2937; }
          .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
          .header { background: #059669; padding: 24px 32px; color: #ffffff; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
          .content { padding: 32px; line-height: 1.6; }
          .btn-container { text-align: center; margin: 28px 0; }
          .btn { background-color: #059669; color: #ffffff !important; padding: 14px 28px; text-decoration: none; font-weight: 600; border-radius: 8px; display: inline-block; box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2); }
          .fallback-link { font-size: 13px; color: #6b7280; word-break: break-all; margin-top: 16px; }
          .footer { padding: 20px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Pharmatrack</h1>
          </div>
          <div class="content">
            <h2>Password Reset Request</h2>
            <p>Hello ${recipientName || 'there'},</p>
            <p>We received a request to reset the password for your Pharmatrack account. Click the button below to choose a new password:</p>
            
            <div class="btn-container">
              <a href="${resetUrl}" class="btn" target="_blank">Reset Password</a>
            </div>

            <p style="font-size: 13px; color: #4b5563;">This link is valid for <strong>1 hour</strong>. If you did not make this request, you can safely ignore this email; your account remains secure.</p>
            
            <div class="fallback-link">
              <p>Button not working? Copy and paste this link in your browser:</p>
              <a href="${resetUrl}">${resetUrl}</a>
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Pharmatrack. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
Hello ${recipientName || 'there'},

We received a request to reset the password for your Pharmatrack account.

Reset your password using the link below (valid for 1 hour):
${resetUrl}

If you did not request this, please ignore this email.

— The Pharmatrack Team
    `;

    try {
      const info = await this.transporter.sendMail({
        from: mailFrom,
        to,
        subject: 'Reset Your Pharmatrack Password',
        text: textContent,
        html: htmlContent,
      });

      this.logger.log(`Password reset email successfully sent to ${to} (MessageId: ${info.messageId})`);
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to send password reset email to ${to}: ${error.message}`);
      return false;
    }
  }

  /**
   * Send staff invitation email with activation link & verification code
   */
  async sendStaffInvitationEmail(
    to: string,
    recipientName: string,
    pharmacyName: string,
    role: string,
    activationCode: string,
    activationToken: string,
  ): Promise<boolean> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const activationUrl = `${frontendUrl}/activate-account?code=${encodeURIComponent(activationCode)}&token=${encodeURIComponent(activationToken)}&email=${encodeURIComponent(to)}`;
    const mailFrom = process.env.MAIL_FROM || `"Pharmatrack" <${process.env.SMTP_USER || 'no-reply@pharmatrack.com'}>`;

    const roleName = role === 'PHARMACIST' ? 'Pharmacist' : role === 'SALES_OFFICER' ? 'Sales Officer' : role;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 24px; color: #1f2937; }
          .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
          .header { background: #059669; padding: 24px 32px; color: #ffffff; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
          .content { padding: 32px; line-height: 1.6; }
          .code-box { background: #f3f4f6; border: 2px dashed #059669; padding: 16px; text-align: center; font-size: 28px; font-weight: 800; letter-spacing: 4px; color: #059669; border-radius: 8px; margin: 24px 0; }
          .btn-container { text-align: center; margin: 28px 0; }
          .btn { background-color: #059669; color: #ffffff !important; padding: 14px 28px; text-decoration: none; font-weight: 600; border-radius: 8px; display: inline-block; box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2); }
          .fallback-link { font-size: 13px; color: #6b7280; word-break: break-all; margin-top: 16px; }
          .footer { padding: 20px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Pharmatrack</h1>
          </div>
          <div class="content">
            <h2>Welcome to ${pharmacyName || 'PharmTrack'}!</h2>
            <p>Hello ${recipientName || 'there'},</p>
            <p>You have been registered as a <strong>${roleName}</strong> at <strong>${pharmacyName}</strong> on the PharmTrack platform.</p>
            <p>To activate your account and set up your password, use your temporary activation code below:</p>
            <div class="code-box">${activationCode}</div>
            <div class="btn-container">
              <a href="${activationUrl}" class="btn" target="_blank">Activate Account</a>
            </div>
            <p class="fallback-link">Or copy and paste this link in your browser:<br><a href="${activationUrl}">${activationUrl}</a></p>
            <p style="font-size: 13px; color: #6b7280;">This activation code and link will expire in 48 hours. If you did not expect this invitation, please contact your pharmacy administrator.</p>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} Pharmatrack System. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        this.logger.warn(`SMTP credentials not configured. Invitation code for ${to} (${recipientName}): ${activationCode}`);
        return true;
      }

      await this.transporter.sendMail({
        from: mailFrom,
        to,
        subject: `Activate your PharmTrack staff account - ${pharmacyName}`,
        html: htmlContent,
      });

      this.logger.log(`Staff activation email sent successfully to ${to}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to send staff activation email to ${to}: ${error.message}`);
      return false;
    }
  }
}

