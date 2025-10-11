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
   * userId별로 하나의 구독만 유지 (최신 디바이스로 업데이트)
   */
  async subscribe(userId: string, subscribeDto: SubscribePushDto) {
    const { endpoint, p256dh, auth, userAgent } = subscribeDto;

    // 기존 구독 확인 (userId 기준)
    let subscription = await this.pushSubscriptionRepository.findOne({
      where: { userId },
    });

    if (subscription) {
      // 기존 구독 업데이트 (최신 디바이스로 교체)
      subscription.endpoint = endpoint;
      subscription.p256dh = p256dh;
      subscription.auth = auth;
      subscription.userAgent = userAgent;
      subscription.isActive = true;
      this.logger.log(`🔄 Push subscription updated for user: ${userId}`);
    } else {
      // 새 구독 생성
      subscription = this.pushSubscriptionRepository.create({
        userId,
        endpoint,
        p256dh,
        auth,
        userAgent,
      });
      this.logger.log(`✅ Push subscription created for user: ${userId}`);
    }

    await this.pushSubscriptionRepository.save(subscription);

    return {
      success: true,
      subscriptionId: subscription.id,
    };
  }

  /**
   * 푸시 구독 해제
   */
  async unsubscribe(userId: string, endpoint: string) {
    const result = await this.pushSubscriptionRepository.update(
      { userId, endpoint },
      { isActive: false },
    );

    this.logger.log(`🔕 Push subscription disabled for user: ${userId}`);
    return { success: (result.affected ?? 0) > 0 };
  }

  /**
   * 사용자의 모든 활성 구독 조회
   */
  async getUserSubscriptions(userId: string) {
    return this.pushSubscriptionRepository.find({
      where: { userId, isActive: true },
    });
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

    // 사용자의 활성 구독 조회
    const subscriptions = await this.getUserSubscriptions(userId);

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

