import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { randomUUID } from 'crypto';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly chatService: ChatService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @MessageBody() data: { roomId: string; roomName?: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId, roomName, userId } = data;
    
    let actualRoomId = roomId;
    
    // roomName이 제공된 경우, 기존 방을 찾거나 새로 생성
    if (roomName) {
      let room = await this.chatService.getRoomByName(roomName);
      if (!room) {
        // 방이 없으면 새로 생성
        room = await this.chatService.createRoom(roomName, `채팅방: ${roomName}`);
      }
      actualRoomId = room.id;
    }
    
    // Join socket room
    client.join(actualRoomId);
    
    // Add user to chat room
    const success = await this.chatService.joinRoom(actualRoomId, userId);
    
    if (success) {
      // Notify room about new user
      this.server.to(actualRoomId).emit('user_joined', {
        userId,
        roomId: actualRoomId,
        timestamp: new Date(),
      });
      
      // Send room info to the user
      const room = await this.chatService.getRoom(actualRoomId);
      client.emit('room_info', room);
      
      // Send recent messages
      const messages = await this.chatService.getRoomMessages(actualRoomId);
      client.emit('room_messages', messages);
    }
    
    return { success, roomId: actualRoomId };
  }

  @SubscribeMessage('leave_room')
  async handleLeaveRoom(
    @MessageBody() data: { roomId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId, userId } = data;
    
    // Leave socket room
    client.leave(roomId);
    
    // Remove user from chat room
    const success = await this.chatService.leaveRoom(roomId, userId);
    
    if (success) {
      // Notify room about user leaving
      this.server.to(roomId).emit('user_left', {
        userId,
        roomId,
        timestamp: new Date(),
      });
    }
    
    return { success };
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @MessageBody() data: {
      roomId: string;
      userId: string;
      content: string;
      type: 'text' | 'image' | 'video' | 'file';
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
    },
  ) {
    const message = await this.chatService.sendMessage(data);
    
    // Broadcast message to room
    this.server.to(data.roomId).emit('new_message', message);
    
    return message;
  }

  @SubscribeMessage('create_room')
  async handleCreateRoom(
    @MessageBody() data: { name: string; description?: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = await this.chatService.createRoom(data.name, data.description);
    
    // Add creator to room
    await this.chatService.joinRoom(room.id, data.userId);
    client.join(room.id);
    
    // Notify creator
    client.emit('room_created', room);
    
    return room;
  }

  @SubscribeMessage('get_user_rooms')
  async handleGetUserRooms(
    @MessageBody() data: { userId: string },
  ) {
    const rooms = await this.chatService.getUserRooms(data.userId);
    return rooms;
  }
}
