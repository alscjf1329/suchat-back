import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailVerification } from '../entities/email-verification.entity';
import { User } from '../../user/entities/user.entity';
import { EmailService } from './email.service';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class EmailVerificationService {
  constructor(
    @InjectRepository(EmailVerification)
    private emailVerificationRepository: Repository<EmailVerification>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private emailService: EmailService,
  ) {}

  async generateVerificationToken(email: string, userData?: any, type: string = 'signup'): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24시간 후 만료

    // 기존 인증 요청이 있으면 삭제
    await this.emailVerificationRepository.delete({ email, type });

    // 새로운 인증 요청 저장 (JSON 형태로 데이터 저장)
    console.log('📧 저장할 사용자 데이터:', {
      email,
      userData: userData ? {
        name: userData.name,
        password: userData.password ? '[암호화됨]' : '없음',
        phone: userData.phone,
        birthday: userData.birthday,
        isActive: userData.isActive,
      } : '없음',
    });

    const savedVerification = await this.emailVerificationRepository.save({
      email,
      token,
      type,
      expiresAt,
      userData: userData || null,
    });

    console.log('📧 이메일 인증 요청 저장 완료:', {
      id: savedVerification.id,
      email: savedVerification.email,
      userData: savedVerification.userData,
    });

    return token;
  }

  async generateVerificationTokenWithUserData(email: string, userData: any, type: string = 'signup'): Promise<string> {
    return this.generateVerificationToken(email, userData, type);
  }

  async findByEmail(email: string): Promise<EmailVerification | null> {
    return await this.emailVerificationRepository.findOne({
      where: { email, type: 'signup' },
    });
  }

  async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    const verification = await this.emailVerificationRepository.findOne({
      where: { token, type: 'signup' },
    });

    if (!verification) {
      return {
        success: false,
        message: '유효하지 않은 인증 토큰입니다.',
      };
    }

    if (verification.isVerified) {
      return {
        success: false,
        message: '이미 인증된 이메일입니다.',
      };
    }

    if (verification.expiresAt < new Date()) {
      return {
        success: false,
        message: '만료된 인증 토큰입니다.',
      };
    }

    // 이메일 인증 완료 시 email_verifications 테이블의 데이터를 users 테이블로 INSERT
    console.log('📧 이메일 인증 완료 - 사용자 데이터를 users 테이블에 insert:', {
      email: verification.email,
      userData: verification.userData,
    });
    
    // 필수 필드 검증
    if (!verification.userData || !verification.userData.name || !verification.userData.password) {
      return {
        success: false,
        message: '인증 데이터가 불완전합니다. 다시 회원가입을 진행해주세요.',
      };
    }
    
    const user = this.userRepository.create({
      name: verification.userData.name,
      email: verification.email,
      password: verification.userData.password,
      phone: verification.userData.phone,
      birthday: verification.userData.birthday,
      isActive: verification.userData.isActive ?? true,
    });
    
    const savedUser = await this.userRepository.save(user);
    
    console.log('✅ 사용자 계정 생성 완료:', savedUser.id);

    // 인증 완료 처리
    verification.isVerified = true;
    await this.emailVerificationRepository.save(verification);

    return {
      success: true,
      message: '이메일 인증이 완료되었습니다.',
    };
  }

  async resendVerificationEmail(email: string): Promise<{ success: boolean; message: string }> {
    const verification = await this.findByEmail(email);
    
    if (!verification) {
      return {
        success: false,
        message: '인증 요청을 찾을 수 없습니다.',
      };
    }

    if (verification.isVerified) {
      return {
        success: false,
        message: '이미 인증된 이메일입니다.',
      };
    }

    // 새로운 토큰 생성 (JSON 데이터 사용)
    const newToken = await this.generateVerificationToken(email, verification.userData, 'signup');
    
    return {
      success: true,
      message: '인증 이메일이 재발송되었습니다.',
    };
  }

  /**
   * 비밀번호 재설정 이메일 발송
   */
  async sendPasswordResetEmail(email: string): Promise<{ success: boolean; message: string }> {
    // 사용자 존재 여부 확인
    const user = await this.userRepository.findOne({ where: { email } });
    
    if (!user) {
      // 보안상 사용자가 없어도 성공 메시지 반환 (이메일 노출 방지)
      return {
        success: true,
        message: '비밀번호 재설정 이메일이 발송되었습니다. 이메일을 확인해주세요.',
      };
    }

    // 토큰 생성 (1시간 만료)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1시간 후 만료

    // 기존 비밀번호 재설정 요청 삭제
    await this.emailVerificationRepository.delete({ 
      email, 
      type: 'password-reset' 
    });

    // 새로운 재설정 요청 저장
    await this.emailVerificationRepository.save({
      email,
      token,
      type: 'password-reset',
      expiresAt,
      userData: null, // 비밀번호 재설정은 userData 불필요
    });

    // 이메일 발송
    const emailSent = await this.emailService.sendPasswordResetEmail(
      email,
      token,
      user.name
    );

    if (!emailSent) {
      return {
        success: false,
        message: '이메일 발송에 실패했습니다.',
      };
    }

    return {
      success: true,
      message: '비밀번호 재설정 이메일이 발송되었습니다. 이메일을 확인해주세요.',
    };
  }

  /**
   * 비밀번호 재설정 (토큰 검증 후 변경)
   */
  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    // 토큰 검증
    const verification = await this.emailVerificationRepository.findOne({
      where: { token, type: 'password-reset' },
    });

    if (!verification) {
      return {
        success: false,
        message: '유효하지 않은 재설정 토큰입니다.',
      };
    }

    if (verification.expiresAt < new Date()) {
      return {
        success: false,
        message: '만료된 재설정 토큰입니다. 다시 요청해주세요.',
      };
    }

    if (verification.isVerified) {
      return {
        success: false,
        message: '이미 사용된 재설정 토큰입니다.',
      };
    }

    // 사용자 찾기
    const user = await this.userRepository.findOne({ 
      where: { email: verification.email } 
    });

    if (!user) {
      return {
        success: false,
        message: '사용자를 찾을 수 없습니다.',
      };
    }

    // 비밀번호 해싱 및 업데이트
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await this.userRepository.save(user);

    // 토큰 사용 완료 처리
    verification.isVerified = true;
    await this.emailVerificationRepository.save(verification);

    console.log(`✅ 비밀번호 재설정 완료: ${user.email}`);

    return {
      success: true,
      message: '비밀번호가 성공적으로 변경되었습니다.',
    };
  }
}
