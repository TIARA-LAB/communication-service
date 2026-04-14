/*import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios'; // 1. Import AxiosError

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  async sendOtp(phone: string, otp: string) {
    try {
      const response = await axios.post('https://api.ng.termii.com/api/sms/send', {
        api_key: process.env.TERMII_API_KEY,
        to: phone,
        from: "N-Alert",
        sms: `Your verification code is ${otp}. It expires in 5 minutes.`,
        type: 'plain',
        channel: 'dnd',
      });

      this.logger.log(` SMS sent successfully to ${phone}`);
      return response.data;
    } catch (error: unknown) {
      // 2. Narrow the type to AxiosError
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        this.logger.error(` Termii Error: ${message}`);
      } else {
        // 3. Handle non-Axios errors (e.g., code crashes)
        this.logger.error(' An unexpected error occurred in SmsService');
      }
      
      throw new Error('SMS Delivery Failed');
    }
  }
}*/

import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  async sendOtp(phone: string, otp: string) {
    // 1. Log the OTP to the console so YOU can see it to test the login
    this.logger.warn(` [DEV MODE] OTP for ${phone} is: ${otp}`);

    // 2. Simulate a successful response instead of calling the failing API
    return {
      message: "Successfully Sent (Mocked)",
      status: "success"
    };
    
    /* Temporary comment out the failing Termii logic 
    until your Sender ID is approved.
    */
  }
}