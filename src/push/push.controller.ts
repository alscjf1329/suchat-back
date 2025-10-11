import {
  Controller,
  Post,
  Delete,
  Body,
  UseGuards,
  Request,
  HttpCode,
  Get,
} from '@nestjs/common';
import { PushService } from './push.service';
import { SubscribePushDto } from './dto/subscribe.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

/**
 * Push 알림 API
 */
@Controller('push')
@UseGuards(JwtAuthGuard)
export class PushController {
  constructor(private readonly pushService: PushService) {}

  /**
   * 푸시 알림 구독
   * POST /push/subscribe
   */
  @Post('subscribe')
  @HttpCode(200)
  async subscribe(@Request() req, @Body() subscribeDto: SubscribePushDto) {
    const userId = req.user.userId; // JWT에서 사용자 ID 추출
    return this.pushService.subscribe(userId, subscribeDto);
  }

  /**
   * 푸시 알림 구독 해제
   * DELETE /push/unsubscribe
   */
  @Delete('unsubscribe')
  @HttpCode(200)
  async unsubscribe(@Request() req, @Body('endpoint') endpoint: string) {
    const userId = req.user.userId;
    return this.pushService.unsubscribe(userId, endpoint);
  }

  /**
   * 테스트 푸시 알림 발송
   * POST /push/test
   */
  @Post('test')
  @HttpCode(200)
  async sendTestPush(@Request() req) {
    const userId = req.user.userId;
    return this.pushService.sendTestPush(userId);
  }

  /**
   * 내 구독 목록 조회
   * GET /push/subscriptions
   */
  @Get('subscriptions')
  async getMySubscriptions(@Request() req) {
    const userId = req.user.userId;
    const subscriptions = await this.pushService.getUserSubscriptions(userId);
    
    return {
      count: subscriptions.length,
      subscriptions: subscriptions.map((sub) => ({
        id: sub.id,
        endpoint: sub.endpoint.substring(0, 50) + '...', // 보안상 일부만
        userAgent: sub.userAgent,
        createdAt: sub.createdAt,
      })),
    };
  }
}

