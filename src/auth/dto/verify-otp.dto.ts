import { IsNotEmpty, IsString, Length, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: '+2348129316522',
    description: 'Phone number in E.164 format',
  })
  @IsNotEmpty()
  @IsString()
  phone!: string;

  @ApiProperty({ example: '123456', description: 'Six-digit OTP' })
  @IsNotEmpty()
  @IsString()
  @Length(6, 6, { message: 'OTP must be 6 digits' })
  otp!: string;
}
