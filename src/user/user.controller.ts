import { Controller, Post, Get, Body, Param, Delete, Put, UseGuards, Request, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api')
export class UserController {
  constructor(private readonly userService: UserService) {}

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

  @Get('users')
  async getAllUsers() {
    const users = await this.userService.getAllUsers();
    return { success: true, data: users };
  }

  // 유저 검색 (페이지네이션 지원) - 인증 불필요 (친구 찾기용)
  @Get('users/search')
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

  // 친구 요청 보내기
  @Post('friends/request')
  async sendFriendRequest(
    @Body('requesterId') requesterId: string,
    @Body('addresseeId') addresseeId: string,
  ) {
    console.log('📨 친구 요청 받음:', { requesterId, addresseeId });
    
    if (!addresseeId) {
      return { success: false, message: 'addresseeId is required' };
    }
    
    const friendRequest = await this.userService.sendFriendRequest(
      requesterId,
      addresseeId,
    );
    return { success: true, data: friendRequest };
  }

  // 친구 요청 수락
  @UseGuards(JwtAuthGuard)
  @Put('friends/:friendId/accept')
  async acceptFriendRequest(
    @Request() req,
    @Param('friendId') friendId: string,
  ) {
    const friendRequest = await this.userService.acceptFriendRequest(
      friendId,
      req.user.userId,
    );
    return { success: true, data: friendRequest };
  }

  // 친구 요청 거절
  @UseGuards(JwtAuthGuard)
  @Put('friends/:friendId/reject')
  async rejectFriendRequest(
    @Request() req,
    @Param('friendId') friendId: string,
  ) {
    const friendRequest = await this.userService.rejectFriendRequest(
      friendId,
      req.user.userId,
    );
    return { success: true, data: friendRequest };
  }

  // 받은 친구 요청 목록
  @UseGuards(JwtAuthGuard)
  @Get('friends/requests/received')
  async getPendingRequests(@Request() req) {
    const requests = await this.userService.getPendingRequests(req.user.userId);
    return { success: true, data: requests };
  }

  // 보낸 친구 요청 목록
  @UseGuards(JwtAuthGuard)
  @Get('friends/requests/sent')
  async getSentRequests(@Request() req) {
    const requests = await this.userService.getSentRequests(req.user.userId);
    return { success: true, data: requests };
  }

  // 친구 목록
  @UseGuards(JwtAuthGuard)
  @Get('friends')
  async getFriends(@Request() req) {
    const friends = await this.userService.getFriends(req.user.userId);
    return { success: true, data: friends };
  }

  // 친구 요청 삭제 (취소)
  @UseGuards(JwtAuthGuard)
  @Delete('friends/:friendId')
  async deleteFriendRequest(
    @Param('friendId') friendId: string,
  ) {
    await this.userService.deleteFriendRequest(friendId);
    return { success: true };
  }
}
