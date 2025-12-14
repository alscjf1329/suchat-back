import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import * as webpush from 'web-push';
import { PushSubscription } from './entities/push-subscription.entity';
import { SubscribePushDto, SendPushJobData } from './dto/subscribe.dto';

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);

  constructor(
    @InjectRepository(PushSubscription)
    private pushSubscriptionRepository: Repository<PushSubscription>,
    @InjectQueue('push-notifications') private pushQueue: Queue,
    private configService: ConfigService,
  ) {}

  /**
   * VAPID 설정 초기화
   */
  onModuleInit() {
    const publicKey = this.configService.get<string>('push.vapid.publicKey');
    const privateKey = this.configService.get<string>('push.vapid.privateKey');
    const subject = this.configService.get<string>('push.vapid.subject') || 'mailto:admin@suchat.com';

    if (!publicKey || !privateKey) {
      this.logger.warn('⚠️  VAPID keys not configured. Push notifications disabled.');
      return;
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
    this.logger.log('✅ Web Push initialized with VAPID');
  }

  /**
   * 푸시 구독 등록 (UPSERT)
   * userId와 deviceId 조합으로 여러 기기 지원
   */
  async subscribe(userId: string, subscribeDto: SubscribePushDto) {
    const { endpoint, p256dh, auth, deviceId, deviceType, deviceName, userAgent } = subscribeDto;

    this.logger.log(`📥 [subscribe] 요청 받음 - userId: ${userId}, deviceId: ${deviceId}, deviceType: ${deviceType}`);
    
    // 필수 필드 검증
    if (!endpoint || !p256dh || !auth) {
      this.logger.error(`❌ [subscribe] 필수 필드 누락 - endpoint: ${!!endpoint}, p256dh: ${!!p256dh}, auth: ${!!auth}`);
      const error: any = new Error('필수 필드가 누락되었습니다: endpoint, p256dh, auth');
      error.code = 'MISSING_REQUIRED_FIELDS';
      error.status = 400;
      throw error;
    }

    // deviceId 필수 검증
    if (!deviceId || deviceId.trim() === '') {
      this.logger.error(`❌ [subscribe] deviceId가 필수입니다 - deviceId: ${deviceId}`);
      const error: any = new Error('deviceId는 필수 필드입니다.');
      error.code = 'MISSING_REQUIRED_FIELDS';
      error.status = 400;
      throw error;
    }

    try {
      // 기존 구독 확인 (userId + deviceId 조합으로만 조회)
      let subscription = await this.pushSubscriptionRepository.findOne({
        where: { userId, deviceId },
      });

      this.logger.log(`🔍 [subscribe] 기존 구독 조회 결과: ${subscription ? '존재함' : '없음'} - userId: ${userId}, deviceId: ${deviceId}`);

      if (subscription) {
        // 기존 구독 업데이트 (동일한 deviceId의 구독 정보만 업데이트)
        subscription.endpoint = endpoint;
        subscription.p256dh = p256dh;
        subscription.auth = auth;
        subscription.deviceType = deviceType;
        subscription.deviceName = deviceName;
        subscription.userAgent = userAgent;
        subscription.isActive = true;
        this.logger.log(`🔄 [UPDATE] Push subscription updated for user: ${userId}, device: ${deviceId} (${deviceType})`);
      } else {
        // 새 구독 생성 (등록되지 않은 deviceId)
        subscription = this.pushSubscriptionRepository.create({
          userId,
          deviceId,
          deviceType,
          deviceName,
          endpoint,
          p256dh,
          auth,
          userAgent,
        });
        this.logger.log(`✅ [CREATE] Push subscription created for user: ${userId}, device: ${deviceId} (${deviceType})`);
      }

      await this.pushSubscriptionRepository.save(subscription);
      this.logger.log(`✅ [subscribe] 구독 저장 완료 - id: ${subscription.id}, deviceId: ${subscription.deviceId}`);

      return {
        success: true,
        subscriptionId: subscription.id,
        deviceId: subscription.deviceId,
        deviceType: subscription.deviceType,
      };
    } catch (error: any) {
      this.logger.error(`❌ [subscribe] 에러 발생:`, {
        message: error.message,
        code: error.code,
        constraint: error.constraint,
        stack: error.stack,
      });
      
      // Unique constraint 에러 처리
      if (error.code === '23505') {
        this.logger.warn(`⚠️  [subscribe] Unique constraint 위반 - constraint: ${error.constraint}`);
        
        // (userId, deviceId) 조합 제약조건 위반인 경우
        if (error.constraint === 'push_subscriptions_userId_deviceId_unique') {
          this.logger.warn(`⚠️  Duplicate (userId, deviceId) detected, attempting to update: ${userId}, ${deviceId}`);
          
          // 기존 레코드를 찾아서 업데이트
          const existing = await this.pushSubscriptionRepository.findOne({
            where: { userId, deviceId },
          });

          if (existing) {
            existing.endpoint = endpoint;
            existing.p256dh = p256dh;
            existing.auth = auth;
            existing.deviceType = deviceType;
            existing.deviceName = deviceName;
            existing.userAgent = userAgent;
            existing.isActive = true;
            
            await this.pushSubscriptionRepository.save(existing);
            
            this.logger.log(`🔄 Push subscription updated (from unique constraint error) for user: ${userId}, device: ${deviceId}`);
            
            return {
              success: true,
              subscriptionId: existing.id,
              deviceId: existing.deviceId,
              deviceType: existing.deviceType,
            };
          } else {
            // 레코드를 찾을 수 없는 경우
            const dbError: any = new Error('구독 정보를 찾을 수 없습니다.');
            dbError.code = 'SUBSCRIPTION_NOT_FOUND';
            dbError.status = 404;
            throw dbError;
          }
        }
        
        // userId 중복 (레거시) - 더 이상 지원하지 않음
        if (error.constraint === 'push_subscriptions_userId_key') {
          this.logger.error(`❌ [subscribe] 레거시 userId 제약조건 위반 - deviceId가 필수입니다. userId: ${userId}, deviceId: ${deviceId}`);
          const constraintError: any = new Error('deviceId는 필수 필드입니다. 각 기기는 고유한 deviceId를 가져야 합니다.');
          constraintError.code = 'MISSING_REQUIRED_FIELDS';
          constraintError.status = 400;
          throw constraintError;
        }
        
        // 알 수 없는 Unique constraint 에러
        const constraintError: any = new Error(`데이터베이스 제약조건 위반: ${error.constraint}`);
        constraintError.code = 'DATABASE_CONSTRAINT_VIOLATION';
        constraintError.status = 409;
        constraintError.details = { constraint: error.constraint };
        throw constraintError;
      }
      
      // 데이터베이스 연결 에러
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        const dbError: any = new Error('데이터베이스 연결에 실패했습니다.');
        dbError.code = 'DATABASE_CONNECTION_FAILED';
        dbError.status = 503;
        throw dbError;
      }
      
      // 데이터베이스 쿼리 에러
      if (error.code && error.code.startsWith('23')) {
        const dbError: any = new Error('데이터베이스 오류가 발생했습니다.');
        dbError.code = 'DATABASE_ERROR';
        dbError.status = 500;
        dbError.details = { dbCode: error.code, constraint: error.constraint };
        throw dbError;
      }
      
      // 다른 에러는 코드와 함께 throw
      const enhancedError: any = error;
      if (!enhancedError.code) {
        enhancedError.code = 'PUSH_SUBSCRIPTION_FAILED';
      }
      if (!enhancedError.status) {
        enhancedError.status = 500;
      }
      throw enhancedError;
    }
  }

  /**
   * 푸시 구독 해제
   */
  async unsubscribe(userId: string, deviceId: string) {
    const result = await this.pushSubscriptionRepository.update(
      { userId, deviceId },
      { isActive: false },
    );

    this.logger.log(`🔕 Push subscription disabled for user: ${userId}, device: ${deviceId}`);
    return { success: (result.affected ?? 0) > 0 };
  }

  /**
   * 사용자의 모든 구독 조회 (활성/비활성 모두)
   */
  async getUserSubscriptions(userId: string) {
    this.logger.log(`🔍 [PushService] getUserSubscriptions 호출 - userId: ${userId}`);
    
    const subscriptions = await this.pushSubscriptionRepository.find({
      where: { userId },
      order: { updatedAt: 'DESC' }, // 최근 업데이트된 순서로 정렬
    });
    
    this.logger.log(`📱 [PushService] 조회 결과: ${subscriptions.length}개 구독 발견`);
    subscriptions.forEach((sub, index) => {
      this.logger.log(`  ${index + 1}. id: ${sub.id}, deviceId: ${sub.deviceId}, deviceType: ${sub.deviceType}, isActive: ${sub.isActive}`);
    });
    
    return subscriptions;
  }

  /**
   * 푸시 알림 전송 (Queue에 추가)
   * @param jobData 푸시 알림 데이터
   */
  async sendPushNotification(jobData: SendPushJobData) {
    const job = await this.pushQueue.add('send-push', jobData, {
      attempts: 3, // 실패 시 3회 재시도
      backoff: {
        type: 'exponential',
        delay: 2000, // 2초, 4초, 8초 간격
      },
      removeOnComplete: true, // 완료 후 자동 삭제
      removeOnFail: false, // 실패 시 보관 (디버깅용)
    });

    this.logger.log(`📬 Push job added: ${job.id} for user: ${jobData.userId}`);
    return { jobId: job.id };
  }

  /**
   * 실제 푸시 발송 (Processor에서 호출)
   */
  async executePush(jobData: SendPushJobData) {
    const { userId, title, body, icon, badge, data, tag } = jobData;

    // 사용자의 활성 구독만 조회 (푸시 발송용)
    const subscriptions = await this.pushSubscriptionRepository.find({
      where: { userId, isActive: true },
    });

    if (subscriptions.length === 0) {
      this.logger.warn(`⚠️  No active subscriptions for user: ${userId}`);
      return { success: false, reason: 'No subscriptions' };
    }

    // 푸시 알림 페이로드
    const payload = JSON.stringify({
      title,
      body,
      icon: icon || this.configService.get('push.defaults.icon'),
      badge: badge || this.configService.get('push.defaults.badge'),
      data: data || {},
      tag: tag || `msg-${Date.now()}`,
    });

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          await webpush.sendNotification(pushSubscription, payload);
          this.logger.log(`✅ Push sent to subscription: ${sub.id}`);
          return { success: true, subscriptionId: sub.id };
        } catch (error) {
          // 410 Gone or 404 Not Found = 구독 만료
          if (error.statusCode === 410 || error.statusCode === 404) {
            await this.pushSubscriptionRepository.update(sub.id, {
              isActive: false,
            });
            this.logger.warn(`🗑️  Subscription expired: ${sub.id}`);
          } else {
            this.logger.error(`❌ Push failed: ${error.message}`, error.stack);
          }
          throw error;
        }
      }),
    );

    const successCount = results.filter((r) => r.status === 'fulfilled').length;

    return {
      success: successCount > 0,
      total: subscriptions.length,
      successCount,
      failedCount: subscriptions.length - successCount,
    };
  }

  /**
   * 기기 이름 업데이트
   */
  async updateDeviceName(userId: string, deviceId: string, deviceName: string) {
    const subscription = await this.pushSubscriptionRepository.findOne({
      where: { userId, deviceId },
    });

    if (!subscription) {
      const error: any = new Error('기기를 찾을 수 없습니다.');
      error.code = 'DEVICE_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    subscription.deviceName = deviceName;
    await this.pushSubscriptionRepository.save(subscription);

    this.logger.log(`📝 Device name updated: ${userId} - ${deviceId} -> ${deviceName}`);
    return {
      success: true,
      deviceId: subscription.deviceId,
      deviceName: subscription.deviceName,
    };
  }

  /**
   * 테스트 푸시 알림 발송
   */
  async sendTestPush(userId: string) {
    return this.sendPushNotification({
      userId,
      title: '🔔 테스트 알림',
      body: 'SuChat 푸시 알림이 정상적으로 작동합니다!',
      data: { type: 'test' },
      tag: 'test-notification',
    });
  }
}

