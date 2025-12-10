import { Controller, Get, Put, Delete, Request, UseGuards, Body, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DeviceService } from './device.service';

@Controller('devices')
@UseGuards(JwtAuthGuard)
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  /**
   * 내 기기 목록 조회
   */
  @Get()
  async getMyDevices(@Request() req) {
    const userId = req.user?.userId || req.user?.id;
    
    if (!userId) {
      throw new Error('User ID not found');
    }

    const devices = await this.deviceService.getUserDevices(userId);

    return {
      success: true,
      count: devices.length,
      devices: devices.map((device) => ({
        id: device.id,
        deviceId: device.deviceId,
        deviceType: device.deviceType,
        deviceName: device.deviceName,
        userAgent: device.userAgent,
        isActive: device.isActive,
        lastLoginAt: device.lastLoginAt,
        createdAt: device.createdAt,
        updatedAt: device.updatedAt,
      })),
    };
  }

  /**
   * 기기 이름 업데이트
   */
  @Put(':deviceId/name')
  async updateDeviceName(
    @Request() req,
    @Param('deviceId') deviceId: string,
    @Body('deviceName') deviceName: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    
    if (!userId) {
      throw new Error('User ID not found');
    }

    if (!deviceName || deviceName.trim().length === 0) {
      throw new Error('기기 이름을 입력해주세요.');
    }

    const device = await this.deviceService.updateDeviceName(
      userId,
      deviceId,
      deviceName.trim(),
    );

    return {
      success: true,
      device: {
        id: device.id,
        deviceId: device.deviceId,
        deviceType: device.deviceType,
        deviceName: device.deviceName,
        userAgent: device.userAgent,
        isActive: device.isActive,
        lastLoginAt: device.lastLoginAt,
        createdAt: device.createdAt,
        updatedAt: device.updatedAt,
      },
    };
  }

  /**
   * 기기 삭제
   */
  @Delete(':deviceId')
  async deleteDevice(@Request() req, @Param('deviceId') deviceId: string) {
    const userId = req.user?.userId || req.user?.id;
    
    if (!userId) {
      throw new Error('User ID not found');
    }

    await this.deviceService.deleteDevice(userId, deviceId);

    return {
      success: true,
      message: '기기가 삭제되었습니다.',
    };
  }
}

