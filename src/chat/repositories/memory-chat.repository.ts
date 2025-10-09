import { Injectable } from '@nestjs/common';
import { IChatRepository } from './postgres-chat.repository';
import { ChatRoom, Message } from '../entities';

interface MemoryChatRoomParticipant {
  roomId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  lastReadMessageId?: string;
  muted: boolean;
  pinned: boolean;
  joinedAt: Date;
}

@Injectable()
export class MemoryChatRepository implements IChatRepository {
  private rooms: Map<string, ChatRoom> = new Map();
  private messages: Map<string, Message[]> = new Map();
  private participants: MemoryChatRoomParticipant[] = [];

  async createRoom(name: string, description?: string, dmKey?: string): Promise<ChatRoom> {
    const room: ChatRoom = {
      id: this.generateId(),
      name,
      description,
      participants: [],
      lastMessageId: undefined,
      lastMessageAt: undefined,
      dmKey,
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [],
      roomParticipants: [],
    } as ChatRoom;
    
    this.rooms.set(room.id, room);
    this.messages.set(room.id, []);
    
    return room;
  }

  async joinRoom(roomId: string, userId: string, role: 'owner' | 'admin' | 'member' = 'member'): Promise<boolean> {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    
    // 참여자 테이블에 추가
    const existingParticipant = this.participants.find(
      p => p.roomId === roomId && p.userId === userId
    );

    if (!existingParticipant) {
      this.participants.push({
        roomId,
        userId,
        role,
        muted: false,
        pinned: false,
        joinedAt: new Date(),
      });

      // 하위 호환성
      if (!room.participants.includes(userId)) {
        room.participants.push(userId);
        room.updatedAt = new Date();
      }
    }
    
    return true;
  }

  async leaveRoom(roomId: string, userId: string): Promise<boolean> {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    
    // 참여자 테이블에서 제거
    this.participants = this.participants.filter(
      p => !(p.roomId === roomId && p.userId === userId)
    );

    // 하위 호환성
    room.participants = room.participants.filter(id => id !== userId);
    room.updatedAt = new Date();
    
    return true;
  }

  async sendMessage(messageData: Omit<Message, 'id' | 'timestamp' | 'room'>): Promise<Message> {
    const message: Message = {
      ...messageData,
      id: this.generateId(),
      timestamp: new Date(),
    } as Message;
    
    const roomMessages = this.messages.get(messageData.roomId) || [];
    roomMessages.push(message);
    this.messages.set(messageData.roomId, roomMessages);
    
    // Update room's last message info
    const room = this.rooms.get(messageData.roomId);
    if (room) {
      room.lastMessageId = message.id;
      room.lastMessageAt = message.timestamp;
      room.updatedAt = new Date();
    }

    // Update sender's last read
    const participant = this.participants.find(
      p => p.roomId === messageData.roomId && p.userId === messageData.userId
    );
    if (participant) {
      participant.lastReadMessageId = message.id;
    }
    
    return message;
  }

  async getRoomMessages(roomId: string, limit = 50, cursor?: { timestamp: Date; id: string }): Promise<Message[]> {
    const messages = this.messages.get(roomId) || [];
    
    let filtered = messages;

    // 키셋 페이지네이션
    if (cursor) {
      filtered = messages.filter(m => 
        m.timestamp < cursor.timestamp || 
        (m.timestamp.getTime() === cursor.timestamp.getTime() && m.id < cursor.id)
      );
    }

    return filtered
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async getRoom(roomId: string): Promise<ChatRoom | null> {
    return this.rooms.get(roomId) || null;
  }

  async getRoomByName(roomName: string): Promise<ChatRoom | null> {
    return Array.from(this.rooms.values()).find(room => room.name === roomName) || null;
  }

  async getUserRooms(userId: string): Promise<ChatRoom[]> {
    // 참여자 테이블 기반 조회
    const userParticipations = this.participants.filter(p => p.userId === userId);
    const roomIds = userParticipations.map(p => p.roomId);
    
    return Array.from(this.rooms.values())
      .filter(r => roomIds.includes(r.id))
      .sort((a, b) => {
        const aTime = a.lastMessageAt || a.createdAt;
        const bTime = b.lastMessageAt || b.createdAt;
        return bTime.getTime() - aTime.getTime();
      });
  }

  async updateLastRead(roomId: string, userId: string, messageId: string): Promise<boolean> {
    const participant = this.participants.find(
      p => p.roomId === roomId && p.userId === userId
    );

    if (!participant) return false;

    participant.lastReadMessageId = messageId;
    return true;
  }

  async getUnreadCount(roomId: string, userId: string): Promise<number> {
    const participant = this.participants.find(
      p => p.roomId === roomId && p.userId === userId
    );

    if (!participant) return 0;

    const roomMessages = this.messages.get(roomId) || [];

    // lastReadMessageId 이후의 메시지 개수 (timestamp 기준)
    if (!participant.lastReadMessageId) {
      return roomMessages.length;
    }

    const lastReadMessage = roomMessages.find(m => m.id === participant.lastReadMessageId);
    if (!lastReadMessage) return roomMessages.length;

    // timestamp + id 복합 비교로 정확한 이후 메시지 개수 계산
    return roomMessages.filter(m => {
      const timeCompare = m.timestamp.getTime() - lastReadMessage.timestamp.getTime();
      if (timeCompare > 0) return true;
      if (timeCompare < 0) return false;
      // 같은 시간이면 id로 비교
      return m.id > participant.lastReadMessageId!;
    }).length;
  }

  async findDmRoom(dmKey: string): Promise<ChatRoom | null> {
    return Array.from(this.rooms.values()).find(r => r.dmKey === dmKey) || null;
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}
