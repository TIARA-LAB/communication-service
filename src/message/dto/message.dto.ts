import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class SendMessageDto {
  @ApiProperty({ example: 2, description: 'The ID of the user receiving the message' })
  @Type(() => Number)
  @IsNumber()
  receiverId!: number;

  @ApiProperty({ example: 'Hello!', description: 'Message content' })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiProperty({ example: 'TEXT', enum: ['TEXT', 'IMAGE', 'VIDEO', 'FILE'] })
  @IsString()
  @IsNotEmpty()
  type!: string;

  @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'Optional file upload' })
  @IsOptional()
  file?: any;
}