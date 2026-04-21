import { Injectable, NotFoundException,BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';

@Injectable()
export class ProfileService {
  constructor(
    private prisma: PrismaService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  // 1. Get Full Profile (Static + Live Status)
 async getProfile(targetUserId: number) {
  // Guard clause: If targetUserId is null or undefined, throw error early
  if (!targetUserId) {
    throw new BadRequestException('Invalid User ID provided');
  }

  const user = await this.prisma.user.findUnique({
    where: { 
      id: targetUserId // This was receiving 'undefined' before
    },
    select: {
      id: true,
      name: true,
      bio: true,
      avatar: true,
      lastSeen: true,
    },
  });

  if (!user) throw new NotFoundException('User not found');

  const onlineStatus = await this.redis.get(`status:${targetUserId}`);

  return {
    ...user,
    status: onlineStatus === 'online' ? 'Online' : 'Offline',
  };
}

  // 2. Update Basic Info (Name/Bio)
  async updateInfo(userId: number, data: { name?: string; bio?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  // 3. Update Avatar URL
  async updateAvatar(userId: number, fileUrl: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatar: fileUrl },
    });
  }
}