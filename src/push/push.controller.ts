import {
  Controller,
  Post,
  Delete,
  Put,
  Body,
  UseGuards,
  Request,
  HttpCode,
  Get,
  Param,
  HttpException,
  HttpStatus,
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
   * 에러 코드를 커스텀 숫자 코드로 변환
   */
  private getCustomErrorCode(errorCode: string): string {
    const errorCodeMap: Record<string, string> = {
      'MISSING_REQUIRED_FIELDS': '02',
      'PUSH_SUBSCRIPTION_FAILED': '03',
      'SUBSCRIPTION_NOT_FOUND': '04',
      'DATABASE_CONSTRAINT_VIOLATION': '05',
      'DATABASE_CONNECTION_FAILED': '06',
      'DATABASE_ERROR': '07',
      'DEVICE_NOT_FOUND': '08',
      'INTERNAL_SERVER_ERROR': '09',
      'UNKNOWN_ERROR': '10',
    };
    
    return errorCodeMap[errorCode] || '10';
  }

  /**
   * 푸시 알림 구독
   * POST /push/subscribe
   */
  @Post('subscribe')
  @HttpCode(200)
  async subscribe(@Request() req, @Body() subscribeDto: SubscribePushDto) {
    try {
      const userId = req.user.userId; // JWT에서 사용자 ID 추출
      return await this.pushService.subscribe(userId, subscribeDto);
    } catch (error: any) {
      // 에러 코드와 메시지를 포함한 응답
      const originalErrorCode = error.code || 'PUSH_SUBSCRIPTION_FAILED';
      const customErrorCode = this.getCustomErrorCode(originalErrorCode);
      const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      const errorMessage = error.message || '푸시 구독에 실패했습니다.';
      
      throw new HttpException(
        {
          success: false,
          errorCode: customErrorCode,
          originalErrorCode,
          message: errorMessage,
          details: error.details || null,
        },
        statusCode,
      );
    }
  }

  /**
   * 푸시 알림 구독 해제
   * DELETE /push/unsubscribe
   */
  @Delete('unsubscribe')
  @HttpCode(200)
  async unsubscribe(@Request() req, @Body('deviceId') deviceId: string) {
    const userId = req.user.userId;
    return this.pushService.unsubscribe(userId, deviceId);
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
    const userId = req.user?.userId || req.user?.id;
    
    if (!userId) {
      console.error('❌ [PushController] userId를 찾을 수 없음:', req.user);
      throw new Error('User ID not found');
    }
    
    console.log(`📱 [PushController] 구독 목록 조회 요청 - userId: ${userId}, 전체 user 객체:`, JSON.stringify(req.user));
    
    const subscriptions = await this.pushService.getUserSubscriptions(userId);
    
    // 로깅 추가 (디버깅용)
    console.log(`📱 [PushController] 사용자 ${userId}의 구독 목록: ${subscriptions.length}개`);
    subscriptions.forEach((sub, index) => {
      console.log(`  ${index + 1}. deviceId: ${sub.deviceId}, deviceName: ${sub.deviceName}, deviceType: ${sub.deviceType}, isActive: ${sub.isActive}, updatedAt: ${sub.updatedAt}`);
    });
    
    return {
      count: subscriptions.length,
      subscriptions: subscriptions.map((sub) => ({
        id: sub.id,
        deviceId: sub.deviceId,
        deviceType: sub.deviceType,
        deviceName: sub.deviceName,
        endpoint: sub.endpoint.substring(0, 50) + '...', // 보안상 일부만
        userAgent: sub.userAgent,
        isActive: sub.isActive,
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt,
      })),
    };
  }

  /**
   * 기기 이름 업데이트
   * PUT /push/subscriptions/:deviceId/name
   */
  @Put('subscriptions/:deviceId/name')
  @HttpCode(200)
  async updateDeviceName(
    @Request() req,
    @Param('deviceId') deviceId: string,
    @Body('deviceName') deviceName: string,
  ) {
    const userId = req.user.userId;
    return this.pushService.updateDeviceName(userId, deviceId, deviceName);
  }

  /**
   * 특정 기기 로그아웃 (구독 해제)
   * DELETE /push/subscriptions/:deviceId
   */
  @Delete('subscriptions/:deviceId')
  @HttpCode(200)
  async logoutDevice(@Request() req, @Param('deviceId') deviceId: string) {
    const userId = req.user.userId;
    return this.pushService.unsubscribe(userId, deviceId);
  }
}

