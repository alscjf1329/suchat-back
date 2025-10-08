import { IsEmail, IsString, IsOptional, IsDateString, MinLength, Matches } from 'class-validator';

export class SignUpDto {
  @IsString()
  @MinLength(2, { message: '이름은 최소 2자 이상이어야 합니다.' })
  name: string;

  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다.' })
  email: string;

  @IsString()
  @MinLength(6, { message: '비밀번호는 최소 6자 이상이어야 합니다.' })
  password: string;

  @IsString()
  @MinLength(6, { message: '비밀번호 확인은 최소 6자 이상이어야 합니다.' })
  confirmPassword: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9-+\s()]+$/, { message: '올바른 전화번호 형식이 아닙니다.' })
  phone?: string;

  @IsOptional()
  @IsDateString({}, { message: '올바른 날짜 형식이 아닙니다.' })
  birthday?: string;
}

export class SignInDto {
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다.' })
  email: string;

  @IsString()
  @MinLength(6, { message: '비밀번호는 최소 6자 이상이어야 합니다.' })
  password: string;
}

export class UserResponseDto {
  id: string;
  name: string;
  email: string;
  phone?: string;
  birthday?: Date;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
