import { 
  Injectable, 
  NotFoundException, 
  UnauthorizedException, 
  BadRequestException 
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InjectRedis } from '@nestjs-modules/ioredis'
import { Redis } from 'ioredis';

@Injectable()
export class MessageService {
  constructor(
    private prisma: PrismaService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async createMessage(senderId: number, data: any) {
    return this.prisma.message.create({
      data: {
        content: data.content,
        receiverId: data.receiverId ? Number(data.receiverId) : null,
        groupId: data.groupId ? Number(data.groupId) : null,
        type: data.type ? data.type.toUpperCase() : 'TEXT',
        fileUrl: data.fileUrl || null,
        senderId: senderId,
      },
      include: {
        sender: { select: { phone: true, name: true, avatar: true } },
      },
    });
  }

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

  async deleteForEveryone(messageId: number, userId: number) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.senderId !== userId) throw new UnauthorizedException();

    return this.prisma.message.update({
      where: { id: messageId },
      data: { content: 'This message was deleted', isDeleted: true, fileUrl: null },
    });
  }

  async searchMessages(userId: number, query: string, partnerId?: number) {
    return this.prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
        ...(partnerId && {
          AND: [{
            OR: [
              { senderId: userId, receiverId: partnerId },
              { senderId: partnerId, receiverId: userId },
            ],
          }],
        }),
        content: { contains: query, mode: 'insensitive' },
        isDeleted: false,
      },
      orderBy: { createdAt: 'desc' },
      include: { sender: { select: { phone: true } } },
    });
  }

  async editMessage(userId: number, messageId: number, newContent: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.senderId !== userId) throw new UnauthorizedException('Cannot edit this message');
    if (message.isDeleted) throw new BadRequestException('Cannot edit a deleted message');

    return this.prisma.message.update({
      where: { id: messageId },
      data: { content: newContent, isEdited: true },
    });
  }

  async forwardMessage(userId: number, messageId: number, receiverId: number) {
    const original = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!original) throw new NotFoundException('Original message not found');

    return this.prisma.message.create({
      data: {
        content: original.content,
        fileUrl: original.fileUrl,
        type: original.type,
        senderId: userId,
        receiverId: receiverId,
        isForwarded: true,
      },
    });
  }

  async toggleStar(userId: number, messageId: number) {
    const existing = await this.prisma.starredMessage.findUnique({
      where: { userId_messageId: { userId, messageId } },
    });

    if (existing) {
      await this.prisma.starredMessage.delete({ where: { id: existing.id } });
      return { starred: false };
    } else {
      await this.prisma.starredMessage.create({ data: { userId, messageId } });
      return { starred: true };
    }
  }

  async getStarredMessages(userId: number) {
    return this.prisma.starredMessage.findMany({
      where: { userId },
      include: { message: true },
    });
  }

  async pinMessage(messageId: number, isPinned: boolean) {
    return this.prisma.message.update({
      where: { id: messageId },
      data: { status: isPinned ? 'PINNED' : 'SENT' },
    });
  }
}