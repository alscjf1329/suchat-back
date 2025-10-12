import { Controller, Get, Query } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async getAllUsers() {
    const users = await this.userService.getAllUsers();
    return { success: true, data: users };
  }

  // 유저 검색 (페이지네이션 지원) - 인증 불필요 (친구 찾기용)
  @Get('search')
  async searchUsers(
    @Query('q') query: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const result = await this.userService.searchUsers(
      query,
      limit ? parseInt(limit, 10) : 20,
      offset ? parseInt(offset, 10) : 0,
    );
    return { success: true, data: result };
  }
}
