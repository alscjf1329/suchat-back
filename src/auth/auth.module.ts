import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { EmailVerificationService } from './services/email-verification.service';
import { EmailService } from './services/email.service';
import { EmailVerification } from './entities/email-verification.entity';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailVerification, User]),
    ConfigModule,
  ],
  controllers: [AuthController],
  providers: [
    EmailVerificationService,
    EmailService,
  ],
  exports: [
    EmailVerificationService,
    EmailService,
  ],
})
export class AuthModule {}