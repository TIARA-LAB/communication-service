import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, ArrayMinSize } from 'class-validator';

export class CreateGroupDto {
  @ApiProperty({ example: 'Team Alpha', description: 'Name of the new group' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({
    example: 'Project discussion group',
    description: 'Optional group description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: [2, 3],
    description: 'Initial member IDs for the group',
  })
  @IsArray()
  @ArrayMinSize(1)
  memberIds!: number[]; // Array of user IDs to add initially
}
