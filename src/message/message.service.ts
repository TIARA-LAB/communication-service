import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InjectRedis } from '@nestjs-modules/ioredis'
import { Redis } from 'ioredis';

@Injectable()
export class MessageService {
  constructor(
    private prisma: PrismaService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  // --- Core Messaging ---

async createMessage(senderId: number, data: any) {
  return this.prisma.message.create({
    data: {
      content: data.content,
      // Convert to Number to satisfy Prisma
      receiverId: data.receiverId ? Number(data.receiverId) : null,
      groupId: data.groupId ? Number(data.groupId) : null,
      type: data.type ? data.type.toUpperCase() : 'TEXT', // Match your Enum case
      fileUrl: data.fileUrl || null,
      senderId: senderId, // This is already a number from JwtStrategy
    },
    include: {
      sender: {
        select: {
          phone: true,
          name: true,
          avatar: true,
        },
      },
    },
  });
}

  // --- Inbox Logic (The WhatsApp Home Screen) ---
  async getInbox(userId: number) {
    const messages = await this.prisma.message.findMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      orderBy: { createdAt: 'desc' },
      include: { sender: true, receiver: true },
    });

    const conversations = new Map();
    for (const msg of messages) {
      const partner = msg.senderId === userId ? msg.receiver : msg.sender;
      if (!partner || conversations.has(partner.id)) continue;

      const isOnline = await this.redis.get(`status:${partner.id}`);
      
      conversations.set(partner.id, {
        partnerId: partner.id,
        partnerPhone: partner.phone,
        lastMessage: msg.isDeleted ? 'This message was deleted' : msg.content,
        time: msg.createdAt,
        isOnline: isOnline === 'online',
        status: msg.status,
      });
    }
    return Array.from(conversations.values());
  }

  // --- Chat History with Pagination ---
  async getChatHistory(userId: number, partnerId: number, cursor?: number) {
    return this.prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: partnerId },
          { senderId: partnerId, receiverId: userId },
        ],
      },
      take: 20,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
      orderBy: { id: 'desc' },
    });
  }

  // --- Mutations ---
  async deleteForEveryone(messageId: number, userId: number) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.senderId !== userId) throw new UnauthorizedException();

    return this.prisma.message.update({
      where: { id: messageId },
      data: { content: 'This message was deleted', isDeleted: true, fileUrl: null },
    });
  }
  // Add this inside the MessageService class
async searchMessages(userId: number, query: string, partnerId?: number) {
  return this.prisma.message.findMany({
    where: {
      // Ensure the user is either the sender or receiver
      OR: [
        { senderId: userId },
        { receiverId: userId },
      ],
      // If a partnerId is provided, restrict search to that specific chat
      ...(partnerId && {
        AND: [
          {
            OR: [
              { senderId: userId, receiverId: partnerId },
              { senderId: partnerId, receiverId: userId },
            ],
          },
        ],
      }),
      // The actual search query
      content: {
        contains: query,
      },
      isDeleted: false, // Don't show revoked messages in search
    },
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      sender: {
        select: {
          phone: true,
        },
      },
    },
  });
}
}