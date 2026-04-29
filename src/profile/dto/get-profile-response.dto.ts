import { ApiProperty } from '@nestjs/swagger';

export class GetProfileResponseDto {
  @ApiProperty({
    example: 1,
    description: 'User ID',
  })
  id!: number;

  @ApiProperty({
    example: 'John Doe',
    description: 'User full name',
  })
  name!: string;

  @ApiProperty({
    example: 'Software developer | Coffee enthusiast',
    description: 'User bio',
  })
  bio!: string | null;

  @ApiProperty({
    example: 'https://example.com/avatar.jpg',
    description: 'User avatar URL',
  })
  avatar!: string | null;

  @ApiProperty({
    example: '2024-04-28T10:30:00Z',
    description: 'Last seen timestamp',
  })
  lastSeen!: Date;

  @ApiProperty({
    example: 'Online',
    description: "User's current online status",
    enum: ['Online', 'Offline'],
  })
  status!: 'Online' | 'Offline';
}
