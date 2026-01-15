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

  @Column({ type: 'varchar', length: 14 })
  startDate: string; // 시작 일시 (yyyymmddHH24mmss)

  @Column({ type: 'varchar', length: 14, nullable: true })
  endDate: string; // 종료 일시 (yyyymmddHH24mmss, 선택사항)

  @Column({ type: 'varchar', length: 14, nullable: true })
  notificationDateTime: string; // 알림 일시 (yyyymmddHH24mmss)

  @Column({ type: 'varchar', length: 10, nullable: true })
  notificationInterval: string; // 알림 반복 간격 (분 단위)

  @Column({ type: 'varchar', length: 10, nullable: true })
  notificationRepeatCount: string; // 알림 반복 횟수

  @Column({ type: 'smallint', default: 0 })
  notificationSent: number; // 푸시 알림 전송 여부 (0: 미전송, 1: 전송됨, 확장 가능)

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

