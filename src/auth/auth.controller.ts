import { Controller, Post, Get, Body, Query, UsePipes, ValidationPipe, forwardRef, Inject } from '@nestjs/common';
import { IsEmail, IsString, IsNotEmpty } from 'class-validator';
import { EmailVerificationService } from './services/email-verification.service';
import { EmailService } from './services/email.service';
import { UserService } from '../user/user.service';

export class SendVerificationEmailDto {
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다.' })
  @IsNotEmpty({ message: '이메일을 입력해주세요.' })
  email: string;
  
  @IsString({ message: '이름은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '이름을 입력해주세요.' })
  name: string;
}

export class ResendVerificationDto {
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다.' })
  @IsNotEmpty({ message: '이메일을 입력해주세요.' })
  email: string;
}

export class ForgotPasswordDto {
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다.' })
  @IsNotEmpty({ message: '이메일을 입력해주세요.' })
  email: string;
}

export class ResetPasswordDto {
  @IsString({ message: '토큰은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '토큰을 입력해주세요.' })
  token: string;

  @IsString({ message: '비밀번호는 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '새 비밀번호를 입력해주세요.' })
  newPassword: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private emailVerificationService: EmailVerificationService,
    private emailService: EmailService,
    @Inject(forwardRef(() => UserService))
    private userService: UserService,
  ) {}

  // ============ 회원가입 & 로그인 ============
  
  @Post('signup')
  async signUp(
    @Body('email') email: string,
    @Body('password') password: string,
    @Body('name') name: string,
  ) {
    const user = await this.userService.signUp(email, password, name);
    return { success: true, data: user };
  }

  @Post('signin')
  async signIn(
    @Body('email') email: string,
    @Body('password') password: string,
    @Body('deviceType') deviceType?: 'mobile' | 'desktop',
  ) {
    const result = await this.userService.signIn(email, password, deviceType || 'desktop');
    return { success: true, data: result };
  }

  @Post('refresh')
  async refreshToken(
    @Body('refreshToken') refreshToken: string,
    @Body('deviceType') deviceType?: 'mobile' | 'desktop',
  ) {
    const result = await this.userService.refreshToken(refreshToken, deviceType || 'desktop');
    return { success: true, data: result };
  }

  @Post('logout')
  async logout(@Body('refreshToken') refreshToken: string) {
    await this.userService.logout(refreshToken);
    return { success: true, message: 'Logged out successfully' };
  }

  // ============ 이메일 인증 ============

  @Post('send-verification-email')
  @UsePipes(new ValidationPipe({ transform: true }))
  async sendVerificationEmail(@Body() body: SendVerificationEmailDto) {
    try {
      // 기존 인증 요청이 있는지 확인
      const existingVerification = await this.emailVerificationService.findByEmail(body.email);
      
      if (!existingVerification) {
        return {
          success: false,
          message: '회원가입 요청을 먼저 완료해주세요.',
        };
      }
      
      // 기존 데이터로 토큰 재생성
      const token = await this.emailVerificationService.generateVerificationToken(
        body.email,
        existingVerification.userData,
        'signup'
      );

      // 이메일 발송
      const emailSent = await this.emailService.sendVerificationEmail(
        body.email,
        token,
        body.name
      );

      if (!emailSent) {
        return {
          success: false,
          message: '이메일 발송에 실패했습니다.',
        };
      }

      return {
        success: true,
        message: '인증 이메일이 발송되었습니다.',
      };
    } catch (error) {
      console.error('이메일 발송 에러:', error);
      return {
        success: false,
        message: '이메일 발송 중 오류가 발생했습니다.',
      };
    }
  }

  @Post('verify-email')
  @UsePipes(new ValidationPipe({ transform: true }))
  async verifyEmail(@Body() body: { token: string }) {
    const result = await this.emailVerificationService.verifyEmail(body.token);
    return result;
  }

  @Post('resend-verification')
  @UsePipes(new ValidationPipe({ transform: true }))
  async resendVerification(@Body() body: ResendVerificationDto) {
    const result = await this.emailVerificationService.resendVerificationEmail(body.email);
    return result;
  }

  @Post('forgot-password')
  @UsePipes(new ValidationPipe({ transform: true }))
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    try {
      const result = await this.emailVerificationService.sendPasswordResetEmail(body.email);
      return result;
    } catch (error) {
      console.error('비밀번호 재설정 이메일 발송 에러:', error);
      return {
        success: false,
        message: '이메일 발송 중 오류가 발생했습니다.',
      };
    }
  }

  @Post('reset-password')
  @UsePipes(new ValidationPipe({ transform: true }))
  async resetPassword(@Body() body: ResetPasswordDto) {
    try {
      const result = await this.emailVerificationService.resetPassword(body.token, body.newPassword);
      return result;
    } catch (error) {
      console.error('비밀번호 재설정 에러:', error);
      return {
        success: false,
        message: '비밀번호 재설정 중 오류가 발생했습니다.',
      };
    }
  }
}