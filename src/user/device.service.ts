import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserDevice } from './entities/user-device.entity';

export interface DeviceInfo {
  deviceId: string;
  deviceType: string;
  deviceName?: string;
  userAgent?: string;
}

@Injectable()
export class DeviceService {
  private readonly logger = new Logger(DeviceService.name);

  constructor(
    @InjectRepository(UserDevice)
    private readonly deviceRepository: Repository<UserDevice>,
  ) {}

  /**
   * 로그인 시 기기 정보 저장 또는 업데이트
   */
  async registerOrUpdateDevice(
    userId: string,
    deviceInfo: DeviceInfo,
  ): Promise<UserDevice> {
    this.logger.log(
      `기기 등록/업데이트 - userId: ${userId}, deviceId: ${deviceInfo.deviceId}, deviceType: ${deviceInfo.deviceType}`,
    );

    // 기존 기기 찾기
    const existingDevice = await this.deviceRepository.findOne({
      where: { userId, deviceId: deviceInfo.deviceId },
    });

    if (existingDevice) {
      // 기존 기기 업데이트
      existingDevice.deviceType = deviceInfo.deviceType;
      existingDevice.deviceName = deviceInfo.deviceName || existingDevice.deviceName;
      existingDevice.userAgent = deviceInfo.userAgent || existingDevice.userAgent;
      existingDevice.lastLoginAt = new Date();
      existingDevice.isActive = true;

      const updated = await this.deviceRepository.save(existingDevice);
      this.logger.log(`기기 정보 업데이트 완료 - deviceId: ${deviceInfo.deviceId}`);
      return updated;
    } else {
      // 새 기기 등록
      const newDevice = this.deviceRepository.create({
        userId,
        deviceId: deviceInfo.deviceId,
        deviceType: deviceInfo.deviceType,
        deviceName: deviceInfo.deviceName,
        userAgent: deviceInfo.userAgent,
        lastLoginAt: new Date(),
        isActive: true,
      });

      const saved = await this.deviceRepository.save(newDevice);
      this.logger.log(`새 기기 등록 완료 - deviceId: ${deviceInfo.deviceId}`);
      return saved;
    }
  }

  /**
   * 사용자의 모든 기기 조회
   */
  async getUserDevices(userId: string): Promise<UserDevice[]> {
    this.logger.log(`사용자 기기 목록 조회 - userId: ${userId}`);

    const devices = await this.deviceRepository.find({
      where: { userId },
      order: { lastLoginAt: 'DESC' },
    });

    this.logger.log(`조회 결과: ${devices.length}개 기기 발견`);
    devices.forEach((device, index) => {
      this.logger.log(
        `  ${index + 1}. deviceId: ${device.deviceId}, deviceType: ${device.deviceType}, deviceName: ${device.deviceName}, lastLoginAt: ${device.lastLoginAt}`,
      );
    });

    return devices;
  }

  /**
   * 기기 이름 업데이트
   */
  async updateDeviceName(
    userId: string,
    deviceId: string,
    deviceName: string,
  ): Promise<UserDevice> {
    this.logger.log(
      `기기 이름 업데이트 - userId: ${userId}, deviceId: ${deviceId}, deviceName: ${deviceName}`,
    );

    const device = await this.deviceRepository.findOne({
      where: { userId, deviceId },
    });

    if (!device) {
      throw new Error('기기를 찾을 수 없습니다.');
    }

    device.deviceName = deviceName;
    return await this.deviceRepository.save(device);
  }

  /**
   * 기기 비활성화 (로그아웃 또는 삭제)
   */
  async deactivateDevice(userId: string, deviceId: string): Promise<void> {
    this.logger.log(`기기 비활성화 - userId: ${userId}, deviceId: ${deviceId}`);

    const device = await this.deviceRepository.findOne({
      where: { userId, deviceId },
    });

    if (device) {
      device.isActive = false;
      await this.deviceRepository.save(device);
      this.logger.log(`기기 비활성화 완료 - deviceId: ${deviceId}`);
    }
  }

  /**
   * 기기 삭제
   */
  async deleteDevice(userId: string, deviceId: string): Promise<void> {
    this.logger.log(`기기 삭제 - userId: ${userId}, deviceId: ${deviceId}`);

    const result = await this.deviceRepository.delete({ userId, deviceId });
    if (result.affected === 0) {
      throw new Error('기기를 찾을 수 없습니다.');
    }

    this.logger.log(`기기 삭제 완료 - deviceId: ${deviceId}`);
  }
}

