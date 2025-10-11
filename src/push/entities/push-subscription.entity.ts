import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 푸시 알림 구독 정보
 * 사용자별 하나의 구독만 유지 (최신 디바이스)
 */
@Entity('push_subscriptions')
export class PushSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  @Index()
  userId: string;

  @Column({ type: 'text' })
  endpoint: string; // 푸시 서버 URL

  @Column({ type: 'varchar', length: 255 })
  p256dh: string; // 암호화 공개키

  @Column({ type: 'varchar', length: 255 })
  auth: string; // 인증 시크릿

  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent?: string; // 디바이스 정보 (선택)

  @Column({ type: 'boolean', default: true })
  isActive: boolean; // 활성화 상태

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

