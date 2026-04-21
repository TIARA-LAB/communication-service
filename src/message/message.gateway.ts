import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Redis } from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis'

@WebSocketGateway({ cors: { origin: '*' } })
export class MessageGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  constructor(@InjectRedis() private readonly redis: Redis) {}

  async handleConnection(client: Socket) {
    const userId = client.handshake.query.userId;
    if (userId) {
      await this.redis.set(`status:${userId}`, 'online');
      client.join(`user_${userId}`);
      this.server.emit('status_update', { userId, status: 'online' });
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.handshake.query.userId;
    if (userId) {
      await this.redis.del(`status:${userId}`);
      this.server.emit('status_update', { userId, status: 'offline' });
    }
  }

  @SubscribeMessage('typing')
  handleTyping(client: Socket, data: { to: number; isTyping: boolean }) {
    this.server.to(`user_${data.to}`).emit('display_typing', { from: client.handshake.query.userId, isTyping: data.isTyping });
  }

}
