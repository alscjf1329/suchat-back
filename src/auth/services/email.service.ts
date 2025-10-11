import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: Transporter;

  constructor(private configService: ConfigService) {
    const emailConfig = {
      host: this.configService.get('EMAIL_HOST', 'smtp.gmail.com'),
      port: this.configService.get('EMAIL_PORT', 587),
      secure: false,
      auth: {
        user: this.configService.get('EMAIL_USER'),
        pass: this.configService.get('EMAIL_PASS'),
      },
    };

    console.log('📧 이메일 설정:', {
      host: emailConfig.host,
      port: emailConfig.port,
      user: emailConfig.auth.user ? '설정됨' : '설정되지 않음',
      pass: emailConfig.auth.pass ? '설정됨' : '설정되지 않음',
    });

    this.transporter = nodemailer.createTransport(emailConfig);
  }

  async sendVerificationEmail(email: string, token: string, userName: string): Promise<boolean> {
    const verificationUrl = `${this.configService.get('FRONTEND_URL', 'http://localhost:3000')}/verify-email?token=${token}`;
    
    console.log('📧 이메일 발송 시도:', {
      to: email,
      userName,
      verificationUrl,
    });
    
    const mailOptions = {
      from: `"SuChat" <${this.configService.get('EMAIL_FROM', 'noreply@suchat.com')}>`,
      to: email,
      subject: 'SuChat 이메일 인증',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #0064FF, #0052CC); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">SuChat</h1>
            <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">이메일 인증</p>
          </div>
          
          <div style="background: white; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-bottom: 20px;">안녕하세요, ${userName}님!</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
              SuChat에 가입해주셔서 감사합니다. 아래 버튼을 클릭하여 이메일 주소를 인증해주세요.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background: #0064FF; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                이메일 인증하기
              </a>
            </div>
            
            <p style="color: #999; font-size: 14px; line-height: 1.5;">
              만약 버튼이 작동하지 않는다면, 아래 링크를 복사하여 브라우저에 붙여넣으세요:<br>
              <a href="${verificationUrl}" style="color: #0064FF; word-break: break-all;">${verificationUrl}</a>
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              이 이메일은 SuChat 회원가입 과정에서 발송되었습니다.<br>
              만약 회원가입을 하지 않으셨다면 이 이메일을 무시하셔도 됩니다.
            </p>
          </div>
        </div>
      `,
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ 이메일 발송 성공:', result.messageId);
      return true;
    } catch (error) {
      console.error('❌ 이메일 발송 실패 상세 정보:');
      console.error('- 에러 타입:', error.constructor.name);
      console.error('- 에러 메시지:', error.message);
      console.error('- 에러 코드:', error.code);
      console.error('- 전체 에러:', error);
      
      // 개발 환경에서 이메일 설정이 안 되어 있을 때 임시 처리
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 개발 환경: 이메일 발송 실패, 인증 링크를 콘솔에 출력');
        console.log('📧 인증 링크:', verificationUrl);
        console.log('📧 토큰:', token);
        return true; // 개발 환경에서는 성공으로 처리
      }
      
      return false;
    }
  }

  async sendPasswordResetEmail(email: string, token: string, userName: string): Promise<boolean> {
    const resetUrl = `${this.configService.get('FRONTEND_URL', 'http://localhost:3001')}/reset-password?token=${token}`;
    
    console.log('📧 비밀번호 재설정 이메일 발송 시도:', {
      to: email,
      userName,
      resetUrl,
    });
    
    const mailOptions = {
      from: `"SuChat" <${this.configService.get('EMAIL_FROM', 'noreply@suchat.com')}>`,
      to: email,
      subject: 'SuChat 비밀번호 재설정',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #0064FF, #0052CC); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🔐 SuChat</h1>
            <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">비밀번호 재설정</p>
          </div>
          
          <div style="background: white; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-bottom: 20px;">안녕하세요, ${userName}님!</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 10px;">
              비밀번호 재설정 요청을 받았습니다. 아래 버튼을 클릭하여 새로운 비밀번호를 설정해주세요.
            </p>
            
            <p style="color: #FF6B6B; font-size: 14px; background: #FFF5F5; padding: 10px; border-radius: 5px; margin-bottom: 30px;">
              ⏰ 이 링크는 <strong>1시간 동안만</strong> 유효합니다.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: #0064FF; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                비밀번호 재설정하기
              </a>
            </div>
            
            <p style="color: #999; font-size: 14px; line-height: 1.5;">
              만약 버튼이 작동하지 않는다면, 아래 링크를 복사하여 브라우저에 붙여넣으세요:<br>
              <a href="${resetUrl}" style="color: #0064FF; word-break: break-all;">${resetUrl}</a>
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <div style="background: #FFF9E6; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
              <p style="color: #856404; margin: 0; font-size: 14px;">
                ⚠️ <strong>보안 안내</strong><br>
                비밀번호 재설정을 요청하지 않으셨다면, 이 이메일을 무시하셔도 됩니다.<br>
                계정은 안전하게 보호됩니다.
              </p>
            </div>
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              이 이메일은 SuChat 비밀번호 재설정 요청에 의해 자동으로 발송되었습니다.
            </p>
          </div>
        </div>
      `,
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ 비밀번호 재설정 이메일 발송 성공:', result.messageId);
      return true;
    } catch (error) {
      console.error('❌ 비밀번호 재설정 이메일 발송 실패:', error.message);
      
      // 개발 환경에서 임시 처리
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 개발 환경: 비밀번호 재설정 링크를 콘솔에 출력');
        console.log('📧 재설정 링크:', resetUrl);
        console.log('📧 토큰:', token);
        return true; // 개발 환경에서는 성공으로 처리
      }
      
      return false;
    }
  }
}
