import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';
import { User } from '../../user/entities/user.entity';
import * as crypto from 'crypto';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  // Access Token 생성 (디바이스별 유효기간)
  generateAccessToken(user: User, deviceType: 'mobile' | 'desktop' = 'desktop'): string {
    const payload = { sub: user.id, email: user.email };
    
    // 디바이스별 유효기간 설정
    const expiresIn = deviceType === 'mobile' ? '24h' : '2h';
    
    this.logger.debug(`Access Token 생성: ${user.email} (${deviceType}, ${expiresIn})`);
    
    return this.jwtService.sign(payload, { expiresIn });
  }

  // Refresh Token 생성 및 저장 (7일)
  async generateRefreshToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7일 후 만료

    // 기존 refresh token 삭제
    await this.refreshTokenRepository.delete({ userId });

    // 새 refresh token 저장
    const refreshToken = this.refreshTokenRepository.create({
      userId,
      token,
      expiresAt,
    });
    await this.refreshTokenRepository.save(refreshToken);

    this.logger.log(`Refresh token created for user: ${userId}`);
    return token;
  }

  // Refresh Token 검증
  async verifyRefreshToken(token: string): Promise<User> {
    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { token },
      relations: ['user'],
    });

    if (!refreshToken) {
      this.logger.warn('Invalid refresh token');
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (new Date() > refreshToken.expiresAt) {
      this.logger.warn('Expired refresh token');
      await this.refreshTokenRepository.delete(refreshToken.id);
      throw new UnauthorizedException('Refresh token expired');
    }

    return refreshToken.user;
  }

  // Refresh Token 무효화 (로그아웃)
  async revokeRefreshToken(token: string): Promise<void> {
    await this.refreshTokenRepository.delete({ token });
    this.logger.log('Refresh token revoked');
  }

  // 만료된 Refresh Token 정리 (크론 작업용)
  async cleanupExpiredTokens(): Promise<void> {
    const result = await this.refreshTokenRepository
      .createQueryBuilder()
      .delete()
      .where('expiresAt < :now', { now: new Date() })
      .execute();

    this.logger.log(`Cleaned up ${result.affected} expired refresh tokens`);
  }
}

