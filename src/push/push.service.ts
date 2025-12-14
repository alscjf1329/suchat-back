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

    try {
      // 기존 구독 확인 (userId + deviceId 조합)
      let subscription = await this.pushSubscriptionRepository.findOne({
        where: { userId, deviceId },
      });

      if (subscription) {
        // 기존 구독 업데이트 (등록된 deviceId의 구독 정보 업데이트)
        subscription.endpoint = endpoint;
        subscription.p256dh = p256dh;
        subscription.auth = auth;
        subscription.deviceType = deviceType;
        subscription.deviceName = deviceName;
        subscription.userAgent = userAgent;
        subscription.isActive = true;
        this.logger.log(`🔄 [UPDATE] Push subscription updated for user: ${userId}, device: ${deviceId} (${deviceType})`);
      } else {
        // deviceId가 없거나 기존 레코드가 없는 경우, userId만으로도 확인 (레거시 지원)
        if (!deviceId) {
          const existingByUserId = await this.pushSubscriptionRepository.findOne({
            where: { userId },
          });
          
          if (existingByUserId) {
            // 기존 레코드 업데이트 (deviceId 추가)
            subscription = existingByUserId;
            subscription.endpoint = endpoint;
            subscription.p256dh = p256dh;
            subscription.auth = auth;
            subscription.deviceId = deviceId || `device-${Date.now()}`;
            subscription.deviceType = deviceType;
            subscription.deviceName = deviceName;
            subscription.userAgent = userAgent;
            subscription.isActive = true;
            this.logger.log(`🔄 Push subscription updated (legacy) for user: ${userId}`);
          } else {
            // 새 구독 생성 (등록되지 않은 deviceId)
            subscription = this.pushSubscriptionRepository.create({
              userId,
              deviceId: deviceId || `device-${Date.now()}`,
              deviceType,
              deviceName,
              endpoint,
              p256dh,
              auth,
              userAgent,
            });
            this.logger.log(`✅ [CREATE] Push subscription created for user: ${userId}, device: ${deviceId || 'auto-generated'} (${deviceType})`);
          }
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
      }

      await this.pushSubscriptionRepository.save(subscription);

      return {
        success: true,
        subscriptionId: subscription.id,
        deviceId: subscription.deviceId,
        deviceType: subscription.deviceType,
      };
    } catch (error) {
      // Unique constraint 에러 처리 (userId 중복)
      if (error.code === '23505' && error.constraint === 'push_subscriptions_userId_key') {
        this.logger.warn(`⚠️  Duplicate userId detected, attempting to update existing subscription: ${userId}`);
        
        // 기존 레코드를 찾아서 업데이트
        const existing = await this.pushSubscriptionRepository.findOne({
          where: { userId },
        });

        if (existing) {
          existing.endpoint = endpoint;
          existing.p256dh = p256dh;
          existing.auth = auth;
          existing.deviceId = deviceId || existing.deviceId || `device-${Date.now()}`;
          existing.deviceType = deviceType || existing.deviceType;
          existing.deviceName = deviceName || existing.deviceName;
          existing.userAgent = userAgent || existing.userAgent;
          existing.isActive = true;
          
          await this.pushSubscriptionRepository.save(existing);
          
          this.logger.log(`🔄 Push subscription updated (from duplicate error) for user: ${userId}`);
          
          return {
            success: true,
            subscriptionId: existing.id,
            deviceId: existing.deviceId,
            deviceType: existing.deviceType,
          };
        }
      }
      
      // 다른 에러는 그대로 throw
      throw error;
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
      throw new Error('Device not found');
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

