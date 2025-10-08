import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Message } from './message.entity';
import { ChatRoomParticipant } from './chat-room-participant.entity';

@Entity('chat_rooms')
export class ChatRoom {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column('text', { array: true, default: [] })
  participants: string[]; // 마이그레이션 후 제거 예정

  @Column({ type: 'uuid', nullable: true })
  lastMessageId?: string;

  @Column({ type: 'timestamp', nullable: true })
  lastMessageAt?: Date;

  @Column({ type: 'varchar', nullable: true, unique: true })
  dmKey?: string; // DM(1:1) 중복 방지용

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Message, message => message.room)
  messages: Message[];

  @OneToMany(() => ChatRoomParticipant, participant => participant.room)
  roomParticipants: ChatRoomParticipant[];
}

