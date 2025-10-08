import { Controller, Post, Get, Put, Delete, Body, Param, ValidationPipe, UsePipes } from '@nestjs/common';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { UserService } from './user.service';
import { SignUpDto, SignInDto, UserResponseDto } from './dto/user.dto';

export class CheckEmailDto {
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다.' })
  @IsNotEmpty({ message: '이메일을 입력해주세요.' })
  email: string;
}

@Controller('auth')
export class UserController {
  constructor(
    private readonly userService: UserService,
  ) {}

  @Post('signup')
  @UsePipes(new ValidationPipe({ transform: true }))
  async signUp(@Body() signUpDto: SignUpDto): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const result = await this.userService.signUp(signUpDto);
      
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Post('signin')
  @UsePipes(new ValidationPipe({ transform: true }))
  async signIn(@Body() signInDto: SignInDto): Promise<{
    success: boolean;
    message: string;
    data: UserResponseDto;
  }> {
    try {
      const user = await this.userService.signIn(signInDto);
      
      return {
        success: true,
        message: '로그인이 완료되었습니다.',
        data: user,
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('user/:id')
  async getUserById(@Param('id') id: string): Promise<{
    success: boolean;
    data: UserResponseDto;
  }> {
    const user = await this.userService.getUserById(id);
    
    return {
      success: true,
      data: user,
    };
  }

  @Put('user/:id')
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateUser(
    @Param('id') id: string,
    @Body() updateData: Partial<SignUpDto>,
  ): Promise<{
    success: boolean;
    message: string;
    data: UserResponseDto;
  }> {
    // birthday 문자열을 Date로 변환
    const processedData = {
      ...updateData,
      birthday: updateData.birthday ? new Date(updateData.birthday) : undefined,
    };
    
    const user = await this.userService.updateUser(id, processedData);
    
    return {
      success: true,
      message: '사용자 정보가 업데이트되었습니다.',
      data: user,
    };
  }

  @Delete('user/:id')
  async deleteUser(@Param('id') id: string): Promise<{
    success: boolean;
    message: string;
  }> {
    await this.userService.deleteUser(id);
    
    return {
      success: true,
      message: '사용자 계정이 삭제되었습니다.',
    };
  }

  @Post('check-email')
  @UsePipes(new ValidationPipe({ transform: true }))
  async checkEmailExists(@Body() checkEmailDto: CheckEmailDto): Promise<{
    success: boolean; 
    data: { exists: boolean };
  }> {
    const exists = await this.userService.checkEmailExists(checkEmailDto.email);
    
    return {
      success: true,
      data: { exists },
    };
  }

  @Get('users')
  async getAllUsers(): Promise<{
    success: boolean;
    data: UserResponseDto[];
  }> {
    const users = await this.userService.getAllUsers();
    
    return {
      success: true,
      data: users,
    };
  }
}
