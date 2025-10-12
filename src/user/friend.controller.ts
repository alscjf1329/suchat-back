import { Controller, Post, Get, Body, Param, Delete, Put, UseGuards, Request } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('friends')
export class FriendController {
  constructor(private readonly userService: UserService) {}

  // 친구 요청 보내기
  @Post('request')
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
  @Put(':friendId/accept')
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
  @Put(':friendId/reject')
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
  @Get('requests/received')
  async getPendingRequests(@Request() req) {
    const requests = await this.userService.getPendingRequests(req.user.userId);
    return { success: true, data: requests };
  }

  // 보낸 친구 요청 목록
  @UseGuards(JwtAuthGuard)
  @Get('requests/sent')
  async getSentRequests(@Request() req) {
    const requests = await this.userService.getSentRequests(req.user.userId);
    return { success: true, data: requests };
  }

  // 친구 목록
  @UseGuards(JwtAuthGuard)
  @Get()
  async getFriends(@Request() req) {
    const friends = await this.userService.getFriends(req.user.userId);
    return { success: true, data: friends };
  }

  // 친구 요청 삭제 (취소)
  @UseGuards(JwtAuthGuard)
  @Delete(':friendId')
  async deleteFriendRequest(
    @Param('friendId') friendId: string,
  ) {
    await this.userService.deleteFriendRequest(friendId);
    return { success: true };
  }
}

