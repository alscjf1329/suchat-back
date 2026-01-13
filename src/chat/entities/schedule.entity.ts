import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { ChatRoom } from './chat-room.entity';
import { User } from '../../user/entities/user.entity';
import { ScheduleParticipant } from './schedule-participant.entity';

@Entity('schedules')
export class Schedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  roomId: string;

  @Column({ type: 'uuid' })
  createdBy: string; // 작성자 ID

  @Column()
  title: string; // 일정 제목

  @Column({ type: 'text', nullable: true })
  memo: string; // 메모 정보

  @Column({ type: 'timestamp' })
  startDate: Date; // 시작 일시

  @Column({ type: 'timestamp', nullable: true })
  endDate: Date; // 종료 일시 (선택사항)

  @Column({ type: 'timestamp', nullable: true })
  notificationDateTime: Date; // 알림 일시

  @Column({ type: 'varchar', length: 10, nullable: true })
  notificationInterval: string; // 알림 반복 간격 (분 단위)

  @Column({ type: 'varchar', length: 10, nullable: true })
  notificationRepeatCount: string; // 알림 반복 횟수

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => ChatRoom, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roomId' })
  room: ChatRoom;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @OneToMany(() => ScheduleParticipant, participant => participant.schedule, { cascade: true })
  participants: ScheduleParticipant[];
}

