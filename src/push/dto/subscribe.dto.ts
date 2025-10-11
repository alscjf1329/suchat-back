import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

/**
 * 푸시 구독 요청 DTO
 */
export class SubscribePushDto {
  @IsNotEmpty()
  @IsString()
  endpoint: string;

  @IsNotEmpty()
  @IsString()
  p256dh: string;

  @IsNotEmpty()
  @IsString()
  auth: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
}

/**
 * 푸시 알림 전송 Job 데이터
 */
export interface SendPushJobData {
  userId: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  tag?: string; // 중복 알림 방지
}

