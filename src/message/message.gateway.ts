import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Redis } from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({
  cors: { origin: '*', method: ['GET', 'POST'], credentials: true },
  transports: ['websocket', 'polling'],
})
export class MessageGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server!: Server;

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly prisma: PrismaService, // 1. This fixes the 'this.prisma' error
  ) {}

  async handleConnection(client: Socket) {
    console.log('--- Handshake Started ---');
    const userId = client.handshake.query.userId;
    console.log('Detected UserID:', userId);

    if (!userId) {
      console.log(' Connection rejected: No UserID provided');
      return client.disconnect();
    }

    try {
      const uId = Number(userId);

      // Checkpoint 1: Redis
      console.log(' Step 1: Connecting to Redis...');
      await this.redis.set(`status:${uId}`, 'online');
      console.log(' Redis status updated');

      // Checkpoint 2: Joining User Room
      client.join(`user_${uId}`);
      console.log(`Joined private room: user_${uId}`);

      // Checkpoint 3: Prisma Query
      console.log('Step 2: Fetching Group Memberships...');
      const userGroups = await this.prisma.groupMember.findMany({
        where: { userId: uId },
        select: { groupId: true },
      });
      console.log(`Found ${userGroups.length} groups`);

      // Checkpoint 4: Joining Group Rooms
      userGroups.forEach((group) => {
        client.join(`group_${group.groupId}`);
        console.log(` Joined group room: group_${group.groupId}`);
      });

      // Final Step
      this.server.emit('status_update', { userId: uId, status: 'online' });
      console.log('--- Connection Successful! ---');
    } catch (error) {
      console.error('---  Connection Error! ---');
      console.error(error);
      client.disconnect();
    }
  }
  async handleDisconnect(client: Socket) {
    const userId = client.handshake.query.userId;
    if (userId) {
      const uId = Number(userId);
      await this.redis.del(`status:${uId}`);

      await this.prisma.user.update({
        where: { id: uId },
        data: { lastSeen: new Date() },
      });

      this.server.emit('status_update', { userId: uId, status: 'offline' });
    }
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    client: Socket,
    payload: {
      content: string;
      receiverId?: number;
      groupId?: number;
      type: string;
    },
  ) {
    const senderId = Number(client.handshake.query.userId);

    // 1. Safety Check: Ensure there is a destination
    if (!payload.groupId && !payload.receiverId) {
      console.error(' Message blocked: No receiverId or groupId provided');
      return;
    }

    try {
      // 2. Save to Database
      const message = await this.prisma.message.create({
        data: {
          content: payload.content,
          senderId: senderId,
          receiverId: payload.receiverId
            ? Number(payload.receiverId)
            : undefined,
          groupId: payload.groupId ? Number(payload.groupId) : undefined,
          type: payload.type as any,
        },
        include: {
          sender: { select: { id: true, name: true, avatar: true } },
        },
      });

      // 3. Smart Routing
      if (payload.groupId) {
        // Group Broadcast
        this.server
          .to(`group_${payload.groupId}`)
          .emit('new_message', JSON.parse(JSON.stringify(message)));
        console.log(` Group Message sent to group_${payload.groupId}`);
      } else if (payload.receiverId) {
        // Private 1-on-1
        this.server
          .to(`user_${payload.receiverId}`)
          .emit('new_message', JSON.parse(JSON.stringify(message)));
        this.server
          .to(`user_${senderId}`)
          .emit('new_message', JSON.parse(JSON.stringify(message)));
        console.log(
          `Private Message sent from ${senderId} to ${payload.receiverId}`,
        );
      }
    } catch (error) {
      console.error(' Failed to process message:', error);
      client.emit('error', { message: 'Message could not be sent' });
    }
  }
}
