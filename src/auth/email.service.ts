import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendOtp(email: string, otp: string) {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      this.logger.error('RESEND_API_KEY is missing!');
      throw new Error('Email configuration error');
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: 'onboarding@resend.dev',
          to: email,
          subject: 'Your Verification Code',
          html: `<strong>Your code is: ${otp}</strong>`,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // This will tell us EXACTLY why it failed (401, 403, 422, etc.)
        this.logger.error(`Resend API Refused: ${JSON.stringify(result)}`);
        throw new Error(result.message || 'API Error');
      }

      this.logger.log(`Email sent successfully to ${email}`);
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Network failure';
      this.logger.error(`Email Service Error: ${errorMessage}`);
      throw new Error('Email delivery failed');
    }
  }
}