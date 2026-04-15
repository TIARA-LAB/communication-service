import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async sendOtp(email: string, otp: string) {
    try {
      const { data, error } = await this.resend.emails.send({
        from: 'Your App <onboarding@resend.dev>', // Replace with your verified domain
        to: [email],
        subject: 'Your Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Verification Code</h2>
            <p>Your verification code is:</p>
            <div style="font-size: 24px; font-weight: bold; color: #333; padding: 10px; border: 1px solid #ddd; display: inline-block;">
              ${otp}
            </div>
            <p>This code will expire in 5 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
          </div>
        `,
      });

      if (error) {
        this.logger.error(`Resend Error: ${error.message}`);
        throw new Error('Email delivery failed');
      }

      this.logger.log(`Email sent successfully to ${email}`);
      return data;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Email delivery failed';
      this.logger.error(`Email Service Error: ${errorMessage}`);
      throw new Error('Email delivery failed');
    }
  }
}
