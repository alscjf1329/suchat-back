import { Injectable, ConflictException, NotFoundException, UnauthorizedException, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import type { IUserRepository } from './repositories/user.repository';
import { SignUpDto, SignInDto, UserResponseDto } from './dto/user.dto';
import { EmailVerificationService } from '../auth/services/email-verification.service';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @Inject('USER_REPOSITORY')
    private userRepository: IUserRepository,
    private emailVerificationService: EmailVerificationService,
  ) {}

  async signUp(signUpDto: SignUpDto): Promise<{ success: boolean; message: string }> {
    const { name, email, password, phone, birthday } = signUpDto;
    this.logger.log(`[signUp] 회원가입 요청: email=${email}, name=${name}`);

    // 이메일 중복 확인
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      this.logger.warn(`[signUp] 이메일 중복: ${email}`);
      throw new ConflictException('이미 존재하는 이메일입니다.');
    }

    // 이메일 인증 대기 중인 사용자 확인
    const existingVerification = await this.emailVerificationService.findByEmail(email);
    if (existingVerification) {
      this.logger.warn(`[signUp] 인증 요청 중복: ${email}`);
      throw new ConflictException('이미 인증 요청이 진행 중인 이메일입니다.');
    }

    // 비밀번호 암호화
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    this.logger.debug(`[signUp] 비밀번호 암호화 완료`);

    // 이메일 인증 토큰 생성
    const userData = {
      name,
      email,
      password: hashedPassword,
      phone,
      birthday: birthday ? new Date(birthday) : undefined,
      isActive: true,
    };
    
    await this.emailVerificationService.generateVerificationTokenWithUserData(
      email,
      userData,
      'signup'
    );

    this.logger.log(`[signUp] 회원가입 요청 완료: ${email}`);
    
    return {
      success: true,
      message: '회원가입 요청이 완료되었습니다. 이메일 인증을 완료해주세요.',
    };
  }

  async signIn(signInDto: SignInDto): Promise<UserResponseDto> {
    const { email, password } = signInDto;
    this.logger.log(`[signIn] 로그인 시도: email=${email}`);

    // 사용자 찾기
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      this.logger.warn(`[signIn] 사용자 없음: ${email}`);
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    // 비밀번호 확인
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      this.logger.warn(`[signIn] 비밀번호 불일치: ${email}`);
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    // 계정 활성화 확인
    if (!user.isActive) {
      this.logger.warn(`[signIn] 비활성 계정: ${email}`);
      throw new UnauthorizedException('비활성화된 계정입니다.');
    }

    // 마지막 로그인 시간 업데이트
    await this.userRepository.update(user.id, { lastLoginAt: new Date() });
    this.logger.log(`[signIn] 로그인 성공: ${email} (${user.name})`);

    return this.mapToResponseDto(user);
  }

  async getUserById(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    return this.mapToResponseDto(user);
  }

  async getUserByEmail(email: string): Promise<UserResponseDto | null> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      return null;
    }
    return this.mapToResponseDto(user);
  }

  async updateUser(id: string, updateData: Partial<User>): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // 비밀번호가 포함된 경우 암호화
    if (updateData.password) {
      const saltRounds = 10;
      updateData.password = await bcrypt.hash(updateData.password, saltRounds);
    }

    const updatedUser = await this.userRepository.update(id, updateData);
    return this.mapToResponseDto(updatedUser);
  }

  async deleteUser(id: string): Promise<boolean> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    return await this.userRepository.delete(id);
  }

  async checkEmailExists(email: string): Promise<boolean> {
    // users 테이블에서만 이메일 중복 확인
    const existingUser = await this.userRepository.findByEmail(email);
    return existingUser !== null;
  }

  async getAllUsers(): Promise<UserResponseDto[]> {
    const users = await this.userRepository.findAll();
    return users.map(user => this.mapToResponseDto(user));
  }

  private mapToResponseDto(user: User): UserResponseDto {
    const { password, ...userResponse } = user;
    return userResponse;
  }
}
