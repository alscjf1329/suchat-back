import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatRoom, Message, ChatRoomParticipant } from '../entities';

export interface IChatRepository {
  createRoom(name: string, description?: string, dmKey?: string): Promise<ChatRoom>;
  joinRoom(roomId: string, userId: string, role?: 'owner' | 'admin' | 'member'): Promise<boolean>;
  leaveRoom(roomId: string, userId: string): Promise<boolean>;
  sendMessage(messageData: Omit<Message, 'id' | 'timestamp' | 'room'>): Promise<Message>;
  getRoomMessages(roomId: string, limit?: number, cursor?: { timestamp: Date; id: string }): Promise<Message[]>;
  getRoom(roomId: string): Promise<ChatRoom | null>;
  getRoomByName(roomName: string): Promise<ChatRoom | null>;
  getUserRooms(userId: string): Promise<ChatRoom[]>;
  updateLastRead(roomId: string, userId: string, messageId: string): Promise<boolean>;
  getUnreadCount(roomId: string, userId: string): Promise<number>;
  findDmRoom(dmKey: string): Promise<ChatRoom | null>;
  getRoomParticipants(roomId: string): Promise<ChatRoomParticipant[]>;
}

@Injectable()
export class PostgresChatRepository implements IChatRepository {
  private readonly logger = new Logger(PostgresChatRepository.name);

  constructor(
    @InjectRepository(ChatRoom)
    private readonly roomRepository: Repository<ChatRoom>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(ChatRoomParticipant)
    private readonly participantRepository: Repository<ChatRoomParticipant>,
  ) {}

  async createRoom(name: string, description?: string, dmKey?: string): Promise<ChatRoom> {
    this.logger.log(`[createRoom] 채팅방 생성: name="${name}", dmKey=${dmKey || 'null'}`);
    const room = this.roomRepository.create({
      name,
      description,
      dmKey,
      participants: [],
    });
    const savedRoom = await this.roomRepository.save(room);
    this.logger.debug(`[createRoom] 저장 완료: id=${savedRoom.id}`);
    return savedRoom;
  }

  async joinRoom(roomId: string, userId: string, role: 'owner' | 'admin' | 'member' = 'member'): Promise<boolean> {
    const room = await this.roomRepository.findOne({ where: { id: roomId } });
    if (!room) return false;

    // 새 참여자 테이블에 추가 또는 업데이트
    const existingParticipant = await this.participantRepository.findOne({
      where: { roomId, userId }
    });

    if (existingParticipant) {
      // 이미 있으면 role 업데이트 (owner로 승격 등)
      existingParticipant.role = role;
      await this.participantRepository.save(existingParticipant);
    } else {
      // 새로 추가
      const participant = this.participantRepository.create({
        roomId,
        userId,
        role,
      });
      await this.participantRepository.save(participant);

      // 하위 호환성: participants 배열도 업데이트 (마이그레이션 완료 후 제거)
      if (!room.participants.includes(userId)) {
        room.participants.push(userId);
        await this.roomRepository.save(room);
      }
    }

    return true;
  }

  async leaveRoom(roomId: string, userId: string): Promise<boolean> {
    const room = await this.roomRepository.findOne({ where: { id: roomId } });
    if (!room) return false;

    // 새 참여자 테이블에서 삭제
    await this.participantRepository.delete({ roomId, userId });

    // 하위 호환성: participants 배열도 업데이트 (마이그레이션 완료 후 제거)
    room.participants = room.participants.filter(id => id !== userId);
    await this.roomRepository.save(room);

    return true;
  }

  async sendMessage(messageData: Omit<Message, 'id' | 'timestamp' | 'room'>): Promise<Message> {
    this.logger.log(`[sendMessage] 메시지 전송: roomId=${messageData.roomId}, userId=${messageData.userId}, type=${messageData.type}`);
    
    const message = this.messageRepository.create(messageData);
    const savedMessage = await this.messageRepository.save(message);
    this.logger.debug(`[sendMessage] 메시지 저장 완료: id=${savedMessage.id}`);
    
    // Update room's last message info
    await this.roomRepository.update(messageData.roomId, { 
      lastMessageId: savedMessage.id,
      lastMessageAt: savedMessage.timestamp,
      updatedAt: new Date() 
    });

    // Update sender's last read (자신이 보낸 메시지는 읽음 처리)
    await this.participantRepository.update(
      { roomId: messageData.roomId, userId: messageData.userId },
      { lastReadMessageId: savedMessage.id }
    );
    this.logger.debug(`[sendMessage] 발신자 읽음 처리 완료`);
    
    return savedMessage;
  }

  async getRoomMessages(roomId: string, limit = 50, cursor?: { timestamp: Date; id: string }): Promise<Message[]> {
    const query = this.messageRepository
      .createQueryBuilder('message')
      .where('message.roomId = :roomId', { roomId })
      .orderBy('message.timestamp', 'DESC')
      .addOrderBy('message.id', 'DESC')
      .take(limit);

    // 키셋 페이지네이션 (커서 기반)
    if (cursor) {
      query.andWhere(
        '(message.timestamp, message.id) < (:cursorTs, :cursorId)',
        { cursorTs: cursor.timestamp, cursorId: cursor.id }
      );
    }

    return await query.getMany();
  }

  async getRoom(roomId: string): Promise<ChatRoom | null> {
    return await this.roomRepository.findOne({ where: { id: roomId } });
  }

  async getRoomByName(roomName: string): Promise<ChatRoom | null> {
    return await this.roomRepository.findOne({ where: { name: roomName } });
  }

  async getUserRooms(userId: string): Promise<ChatRoom[]> {
    // 새 참여자 테이블 기반 조회 (최적화)
    return await this.roomRepository
      .createQueryBuilder('room')
      .innerJoin('room.roomParticipants', 'participant')
      .where('participant.userId = :userId', { userId })
      .orderBy('room.lastMessageAt', 'DESC', 'NULLS LAST')
      .addOrderBy('room.createdAt', 'DESC')
      .getMany();
  }

  async updateLastRead(roomId: string, userId: string, messageId: string): Promise<boolean> {
    this.logger.debug(`[updateLastRead] 읽음 처리: roomId=${roomId}, userId=${userId}, messageId=${messageId}`);
    
    const result = await this.participantRepository.update(
      { roomId, userId },
      { lastReadMessageId: messageId }
    );
    
    const success = (result.affected ?? 0) > 0;
    if (success) {
      this.logger.log(`[updateLastRead] 읽음 처리 성공: ${messageId}`);
    } else {
      this.logger.warn(`[updateLastRead] 읽음 처리 실패 - 참여자 없음: roomId=${roomId}, userId=${userId}`);
    }
    
    return success;
  }

  async getUnreadCount(roomId: string, userId: string): Promise<number> {
    const participant = await this.participantRepository.findOne({
      where: { roomId, userId }
    });

    this.logger.debug(`[getUnreadCount] 조회: roomId=${roomId}, userId=${userId}, lastReadMessageId=${participant?.lastReadMessageId}`);

    if (!participant) {
      this.logger.warn(`[getUnreadCount] 참여자 없음: roomId=${roomId}, userId=${userId}`);
      return 0;
    }
    
    if (!participant.lastReadMessageId) {
      const count = await this.messageRepository.count({ where: { roomId } });
      this.logger.debug(`[getUnreadCount] 읽은 메시지 없음 → 전체: ${count}개`);
      return count;
    }

    const lastReadMessage = await this.messageRepository.findOne({
      where: { id: participant.lastReadMessageId }
    });

    if (!lastReadMessage) {
      const count = await this.messageRepository.count({ where: { roomId } });
      this.logger.warn(`[getUnreadCount] 읽은 메시지 삭제됨 → 전체: ${count}개`);
      return count;
    }

    // 전체 메시지 조회해서 직접 필터링
    const allMessages = await this.messageRepository.find({
      where: { roomId },
      order: { timestamp: 'ASC', id: 'ASC' }
    });

    this.logger.debug(`[getUnreadCount] 전체 메시지: ${allMessages.length}개, 읽은 메시지: ${lastReadMessage.content?.substring(0, 20)}...`);

    // 읽은 메시지 이후의 메시지만 필터링
    const unreadMessages = allMessages.filter(m => {
      if (m.timestamp > lastReadMessage.timestamp) return true;
      if (m.timestamp < lastReadMessage.timestamp) return false;
      // 같은 시간이면 id 비교
      return m.id > participant.lastReadMessageId!;
    });

    const count = unreadMessages.length;
    
    if (count > 0) {
      this.logger.debug(`[getUnreadCount] 안읽은 메시지 ${count}개: ${unreadMessages.map(m => m.content?.substring(0, 10)).join(', ')}`);
    } else {
      this.logger.debug(`[getUnreadCount] 모든 메시지 읽음 ✓`);
    }
    
    return count;
  }

  async findDmRoom(dmKey: string): Promise<ChatRoom | null> {
    this.logger.debug(`[findDmRoom] DM 조회: dmKey=${dmKey}`);
    
    const room = await this.roomRepository.findOne({
      where: { dmKey }
    });

    if (room) {
      this.logger.log(`[findDmRoom] 기존 DM 발견: roomId=${room.id}`);
    } else {
      this.logger.debug(`[findDmRoom] DM 없음`);
    }

    return room;
  }

  async getRoomParticipants(roomId: string): Promise<ChatRoomParticipant[]> {
    this.logger.debug(`[getRoomParticipants] 참여자 조회: roomId=${roomId}`);
    
    const participants = await this.participantRepository.find({
      where: { roomId }
    });

    this.logger.log(`[getRoomParticipants] 참여자 ${participants.length}명 조회됨`);
    return participants;
  }
}
