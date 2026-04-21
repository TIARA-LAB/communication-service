import { IsString, IsArray, IsOptional, ArrayMinSize } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ArrayMinSize(1)
  memberIds: number[]; // Array of user IDs to add initially
}