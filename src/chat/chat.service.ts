import { Injectable, Inject } from '@nestjs/common';
import type { IChatRepository } from './repositories/postgres-chat.repository';
import { ChatRoom, Message } from './entities';

@Injectable()
export class ChatService {
  constructor(
    @Inject('CHAT_REPOSITORY') private readonly chatRepository: IChatRepository,
  ) {}

  async createRoom(name: string, description?: string, dmKey?: string): Promise<ChatRoom> {
    return await this.chatRepository.createRoom(name, description, dmKey);
  }

  async joinRoom(roomId: string, userId: string, role?: 'owner' | 'admin' | 'member'): Promise<boolean> {
    return await this.chatRepository.joinRoom(roomId, userId, role);
  }

  async leaveRoom(roomId: string, userId: string): Promise<boolean> {
    return await this.chatRepository.leaveRoom(roomId, userId);
  }

  async sendMessage(messageData: Omit<Message, 'id' | 'timestamp' | 'room'>): Promise<Message> {
    return await this.chatRepository.sendMessage(messageData);
  }

  async getRoomMessages(roomId: string, limit = 50): Promise<Message[]> {
    return await this.chatRepository.getRoomMessages(roomId, limit);
  }

  async getRoom(roomId: string): Promise<ChatRoom | null> {
    return await this.chatRepository.getRoom(roomId);
  }

  async getUserRooms(userId: string): Promise<ChatRoom[]> {
    return await this.chatRepository.getUserRooms(userId);
  }

  async getRoomByName(roomName: string): Promise<ChatRoom | null> {
    return await this.chatRepository.getRoomByName(roomName);
  }

  async updateLastRead(roomId: string, userId: string, messageId: string): Promise<boolean> {
    return await this.chatRepository.updateLastRead(roomId, userId, messageId);
  }

  async getUnreadCount(roomId: string, userId: string): Promise<number> {
    return await this.chatRepository.getUnreadCount(roomId, userId);
  }
}
