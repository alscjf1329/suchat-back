import { Processor, Process, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { PushService } from './push.service';
import { SendPushJobData } from './dto/subscribe.dto';

/**
 * Push 알림 Queue Processor
 * Redis에 저장된 작업을 순차적으로 처리
 */
@Processor('push-notifications')
export class PushProcessor {
  private readonly logger = new Logger(PushProcessor.name);

  constructor(private readonly pushService: PushService) {}

  /**
   * 푸시 알림 발송 작업 처리
   * 동시 5개 작업 처리
   */
  @Process({ name: 'send-push', concurrency: 5 })
  async handleSendPush(job: Job<SendPushJobData>) {
    const { userId, title, body } = job.data;

    this.logger.log(
      `📤 Processing push job ${job.id} for user ${userId}: ${title}`,
    );

    try {
      await job.progress(10);

      // 실제 푸시 발송
      const result = await this.pushService.executePush(job.data);

      await job.progress(100);

      this.logger.log(
        `✅ Push job ${job.id} completed: ${result.successCount}/${result.total} sent`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `❌ Push job ${job.id} failed: ${error.message}`,
        error.stack,
      );
      throw error; // Bull Queue가 재시도 처리
    }
  }

  /**
   * 작업 완료 이벤트
   */
  @OnQueueCompleted()
  async onCompleted(job: Job) {
    this.logger.log(`✅ Job ${job.id} completed successfully`);
  }

  /**
   * 작업 실패 이벤트
   */
  @OnQueueFailed()
  async onFailed(job: Job, error: Error) {
    this.logger.error(
      `❌ Job ${job.id} failed after ${job.attemptsMade} attempts: ${error.message}`,
    );
  }
}

