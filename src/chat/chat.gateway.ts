import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { PushService } from '../push/push.service';
import { randomUUID } from 'crypto';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly pushService: PushService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`[WS] 클라이언트 연결: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`[WS] 클라이언트 연결 해제: ${client.id}`);
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @MessageBody() data: { roomId: string; roomName?: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId, roomName, userId } = data;
    this.logger.log(`[join_room] 사용자 ${userId} 채팅방 참여 시도: ${roomId || roomName}`);
    
    // 소켓에 userId 저장 (푸시 알림 오프라인 감지용)
    (client as any).userId = userId;
    
    let actualRoomId = roomId;
    
    // roomName이 제공된 경우, 기존 방을 찾거나 새로 생성
    if (roomName) {
      let room = await this.chatService.getRoomByName(roomName);
      if (!room) {
        this.logger.debug(`[join_room] 채팅방 없음, 새로 생성: ${roomName}`);
        room = await this.chatService.createRoom(roomName, `채팅방: ${roomName}`);
      }
      actualRoomId = room.id;
    }
    
    // Join socket room
    client.join(actualRoomId);
    
    // Add user to chat room
    const success = await this.chatService.joinRoom(actualRoomId, userId);
    
    if (success) {
      this.logger.log(`[join_room] 참여 성공: roomId=${actualRoomId}, userId=${userId}`);
      
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
      this.logger.debug(`[join_room] 메시지 전송: ${messages.length}개`);
      client.emit('room_messages', messages);

      // Send unread count
      const unreadCount = await this.chatService.getUnreadCount(actualRoomId, userId);
      this.logger.debug(`[join_room] 안읽음 개수: ${unreadCount}개`);
      client.emit('unread_count', { roomId: actualRoomId, count: unreadCount });
    }
    
    return { success, roomId: actualRoomId };
  }

  @SubscribeMessage('mark_as_read')
  async handleMarkAsRead(
    @MessageBody() data: { roomId: string; userId: string; messageId: string },
  ) {
    this.logger.debug(`[mark_as_read] 읽음 처리: roomId=${data.roomId}, userId=${data.userId}, messageId=${data.messageId}`);
    const success = await this.chatService.updateLastRead(data.roomId, data.userId, data.messageId);
    this.logger.log(`[mark_as_read] 읽음 처리 ${success ? '성공' : '실패'}: ${data.messageId}`);
    return { success };
  }

  @SubscribeMessage('leave_room')
  async handleLeaveRoom(
    @MessageBody() data: { roomId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId, userId } = data;
    this.logger.log(`[leave_room] 사용자 퇴장: roomId=${roomId}, userId=${userId}`);
    
    // Leave socket room
    client.leave(roomId);
    
    // Remove user from chat room
    const success = await this.chatService.leaveRoom(roomId, userId);
    
    if (success) {
      this.logger.debug(`[leave_room] 퇴장 성공, 알림 전송`);
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
    this.logger.log(`[send_message] 메시지 전송: roomId=${data.roomId}, type=${data.type}`);
    this.logger.debug(`[send_message] 내용: ${data.content?.substring(0, 50)}...`);
    
    const message = await this.chatService.sendMessage(data);
    
    // Broadcast message to room
    this.server.to(data.roomId).emit('new_message', message);
    this.logger.debug(`[send_message] 브로드캐스트 완료: messageId=${message.id}`);
    
    // 푸시 알림 발송 (오프라인 사용자에게)
    await this.sendPushNotifications(data.roomId, data.userId, message);
    
    return message;
  }

  /**
   * 채팅방 참여자에게 푸시 알림 발송
   */
  private async sendPushNotifications(roomId: string, senderId: string, message: any) {
    try {
      const room = await this.chatService.getRoom(roomId);
      if (!room) return;

      // 채팅방의 모든 참여자 조회
      const participants = await this.chatService.getRoomParticipants(roomId);
      
      // 현재 채팅방에 있는 사용자 ID 추출 (Socket.io room 기반)
      const roomSockets = await this.server.in(roomId).fetchSockets();
      const usersInRoom = roomSockets
        .map((socket) => (socket as any).userId)
        .filter(Boolean);

      // 발신자를 제외하고, 현재 채팅방에 없는 참여자에게만 푸시
      const notInRoomParticipants = participants
        .filter((p) => p.userId !== senderId) // 발신자 제외
        .filter((p) => !usersInRoom.includes(p.userId)); // 채팅방에 없는 사람만

      this.logger.debug(
        `[push] 푸시 대상: ${notInRoomParticipants.length}명 (전체: ${participants.length}명, 채팅방 내: ${usersInRoom.length}명)`,
      );

      // 채팅방에 없는 사용자에게 푸시 알림 큐 추가
      for (const participant of notInRoomParticipants) {
        await this.pushService.sendPushNotification({
          userId: participant.userId,
          title: room.name || '새 메시지',
          body: message.type === 'text' 
            ? message.content 
            : `${message.type === 'image' ? '📷 사진' : message.type === 'video' ? '🎥 동영상' : '📎 파일'}을 보냈습니다`,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-192x192.png',
          data: {
            roomId,
            messageId: message.id,
            type: 'chat_message',
          },
          tag: `room-${roomId}`, // 같은 방의 알림은 덮어쓰기
        });
      }

      this.logger.log(`[push] 푸시 알림 큐 추가 완료: ${notInRoomParticipants.length}명`);
    } catch (error) {
      this.logger.error(`[push] 푸시 알림 발송 실패: ${error.message}`, error.stack);
    }
  }

  @SubscribeMessage('create_room')
  async handleCreateRoom(
    @MessageBody() data: { name: string; description?: string; userId: string; participantIds?: string[] },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`[create_room] 채팅방 생성: name="${data.name}", creator=${data.userId}, participants=${data.participantIds?.length || 0}명`);
    
    // 1. DM 중복 방지 키 생성
    let dmKey: string | undefined;
    if (data.participantIds && data.participantIds.length === 1) {
      const users = [data.userId, data.participantIds[0]].sort();
      dmKey = `${users[0]}:${users[1]}`;
      this.logger.debug(`[create_room] DM 키 생성: ${dmKey}`);
    }

    // 2. 채팅방 생성
    const room = await this.chatService.createRoom(data.name, data.description, dmKey);
    client.join(room.id);
    this.logger.log(`[create_room] 채팅방 생성 완료: roomId=${room.id}`);

    // 3. 생성자를 owner로 추가
    await this.chatService.joinRoom(room.id, data.userId, 'owner');
    this.logger.debug(`[create_room] 생성자 추가 완료: ${data.userId} (owner)`);

    // 4. 선택된 친구들을 member로 추가 (생성자 제외)
    if (data.participantIds && data.participantIds.length > 0) {
      for (const participantId of data.participantIds) {
        if (participantId !== data.userId) {
          await this.chatService.joinRoom(room.id, participantId, 'member');
        }
      }
      this.logger.debug(`[create_room] 참여자 추가 완료: ${data.participantIds.length}명`);
    }

    // 5. 생성 완료 알림
    client.emit('room_created', room);
    
    return room;
  }

  @SubscribeMessage('get_user_rooms')
  async handleGetUserRooms(
    @MessageBody() data: { userId: string },
  ) {
    this.logger.debug(`[get_user_rooms] 채팅방 목록 조회: userId=${data.userId}`);
    
    const rooms = await this.chatService.getUserRooms(data.userId);
    this.logger.log(`[get_user_rooms] 채팅방 ${rooms.length}개 조회됨`);
    
    // 각 채팅방의 안읽은 메시지 수 계산
    const roomsWithUnread = await Promise.all(
      rooms.map(async (room) => {
        const unreadCount = await this.chatService.getUnreadCount(room.id, data.userId);
        return {
          ...room,
          unreadCount,
        };
      })
    );
    
    this.logger.debug(`[get_user_rooms] 안읽음 개수 계산 완료`);
    return roomsWithUnread;
  }

  @SubscribeMessage('get_or_create_dm')
  async handleGetOrCreateDm(
    @MessageBody() data: { userId1: string; userId2: string; userName1: string; userName2: string },
  ) {
    this.logger.log(`[get_or_create_dm] DM 조회/생성: ${data.userId1} <-> ${data.userId2}`);
    
    const room = await this.chatService.getOrCreateDmRoom(
      data.userId1,
      data.userId2,
      data.userName1,
      data.userName2,
    );

    this.logger.log(`[get_or_create_dm] DM 준비 완료: roomId=${room.id}`);
    return room;
  }
}
