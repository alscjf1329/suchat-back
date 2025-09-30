import { Injectable } from '@nestjs/common';
import { IChatRepository } from './postgres-chat.repository';
import { ChatRoom, Message } from '../entities';

@Injectable()
export class MemoryChatRepository implements IChatRepository {
  private rooms: Map<string, ChatRoom> = new Map();
  private messages: Map<string, Message[]> = new Map();

  async createRoom(name: string, description?: string): Promise<ChatRoom> {
    const room: ChatRoom = {
      id: this.generateId(),
      name,
      description,
      participants: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [],
    } as ChatRoom;
    
    this.rooms.set(room.id, room);
    this.messages.set(room.id, []);
    
    return room;
  }

  async joinRoom(roomId: string, userId: string): Promise<boolean> {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    
    if (!room.participants.includes(userId)) {
      room.participants.push(userId);
      room.updatedAt = new Date();
    }
    
    return true;
  }

  async leaveRoom(roomId: string, userId: string): Promise<boolean> {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    
    room.participants = room.participants.filter(id => id !== userId);
    room.updatedAt = new Date();
    
    return true;
  }

  async sendMessage(messageData: Omit<Message, 'id' | 'timestamp'>): Promise<Message> {
    const message: Message = {
      ...messageData,
      id: this.generateId(),
      timestamp: new Date(),
    } as Message;
    
    const roomMessages = this.messages.get(messageData.roomId) || [];
    roomMessages.push(message);
    this.messages.set(messageData.roomId, roomMessages);
    
    // Update room timestamp
    const room = this.rooms.get(messageData.roomId);
    if (room) {
      room.updatedAt = new Date();
    }
    
    return message;
  }

  async getRoomMessages(roomId: string, limit = 50): Promise<Message[]> {
    const messages = this.messages.get(roomId) || [];
    return messages.slice(-limit);
  }

  async getRoom(roomId: string): Promise<ChatRoom | null> {
    return this.rooms.get(roomId) || null;
  }

  async getRoomByName(roomName: string): Promise<ChatRoom | null> {
    return Array.from(this.rooms.values()).find(room => room.name === roomName) || null;
  }

  async getUserRooms(userId: string): Promise<ChatRoom[]> {
    return Array.from(this.rooms.values())
      .filter(room => room.participants.includes(userId))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}
