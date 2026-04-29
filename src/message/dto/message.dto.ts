import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ example: 2, description: 'The ID of the user receiving the message' })

  receiverId!: number; 

  @ApiProperty({ example: 'Hello!', description: 'Message content' })
  content!: string; 

  @ApiProperty({ example: 'TEXT', enum: ['TEXT', 'IMAGE', 'VIDEO', 'FILE'] })
  type!: string; 

  @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'Optional file upload' })
  file?: any; 
}