import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { EmailVerificationService } from './services/email-verification.service';
import { EmailService } from './services/email.service';
import { TokenService } from './services/token.service';
import { EmailVerification } from './entities/email-verification.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from '../user/entities/user.entity';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailVerification, RefreshToken, User]),
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-secret-key',
        // signOptions는 TokenService에서 디바이스별로 설정
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    EmailVerificationService,
    EmailService,
    TokenService,
    JwtStrategy,
  ],
  exports: [
    EmailVerificationService,
    EmailService,
    TokenService,
    JwtModule,
    PassportModule,
  ],
})
export class AuthModule {}