import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatRoom, Message } from '../entities';

export interface IChatRepository {
  createRoom(name: string, description?: string): Promise<ChatRoom>;
  joinRoom(roomId: string, userId: string): Promise<boolean>;
  leaveRoom(roomId: string, userId: string): Promise<boolean>;
  sendMessage(messageData: Omit<Message, 'id' | 'timestamp' | 'room'>): Promise<Message>;
  getRoomMessages(roomId: string, limit?: number): Promise<Message[]>;
  getRoom(roomId: string): Promise<ChatRoom | null>;
  getRoomByName(roomName: string): Promise<ChatRoom | null>;
  getUserRooms(userId: string): Promise<ChatRoom[]>;
}

@Injectable()
export class PostgresChatRepository implements IChatRepository {
  constructor(
    @InjectRepository(ChatRoom)
    private readonly roomRepository: Repository<ChatRoom>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
  ) {}

  async createRoom(name: string, description?: string): Promise<ChatRoom> {
    const room = this.roomRepository.create({
      name,
      description,
      participants: [],
    });
    return await this.roomRepository.save(room);
  }

  async joinRoom(roomId: string, userId: string): Promise<boolean> {
    const room = await this.roomRepository.findOne({ where: { id: roomId } });
    if (!room) return false;

    if (!room.participants.includes(userId)) {
      room.participants.push(userId);
      await this.roomRepository.save(room);
    }
    return true;
  }

  async leaveRoom(roomId: string, userId: string): Promise<boolean> {
    const room = await this.roomRepository.findOne({ where: { id: roomId } });
    if (!room) return false;

    room.participants = room.participants.filter(id => id !== userId);
    await this.roomRepository.save(room);
    return true;
  }

  async sendMessage(messageData: Omit<Message, 'id' | 'timestamp' | 'room'>): Promise<Message> {
    const message = this.messageRepository.create(messageData);
    const savedMessage = await this.messageRepository.save(message);
    
    // Update room timestamp
    await this.roomRepository.update(messageData.roomId, { updatedAt: new Date() });
    
    return savedMessage;
  }

  async getRoomMessages(roomId: string, limit = 50): Promise<Message[]> {
    return await this.messageRepository.find({
      where: { roomId },
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  async getRoom(roomId: string): Promise<ChatRoom | null> {
    return await this.roomRepository.findOne({ where: { id: roomId } });
  }

  async getRoomByName(roomName: string): Promise<ChatRoom | null> {
    return await this.roomRepository.findOne({ where: { name: roomName } });
  }

  async getUserRooms(userId: string): Promise<ChatRoom[]> {
    return await this.roomRepository
      .createQueryBuilder('room')
      .where('room.participants @> :userId', { userId: `["${userId}"]` })
      .orderBy('room.updatedAt', 'DESC')
      .getMany();
  }
}
