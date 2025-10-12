import { Injectable, Logger, UnauthorizedException, ConflictException, NotFoundException, Inject } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import type { IUserRepository } from './repositories/user.repository';
import { Friend, FriendStatus } from './entities/friend.entity';
import type { IFriendRepository } from './repositories/friend.repository';
import { TokenService } from '../auth/services/token.service';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @Inject('IFriendRepository')
    private readonly friendRepository: IFriendRepository,
    private readonly tokenService: TokenService,
  ) {}

  async signIn(
    email: string, 
    password: string, 
    deviceType: 'mobile' | 'desktop' = 'desktop'
  ): Promise<{ accessToken: string; refreshToken: string; user: User }> {
    this.logger.log(`SignIn attempt for email: ${email} (device: ${deviceType})`);
    
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      this.logger.warn(`SignIn failed: User not found - ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      this.logger.warn(`SignIn failed: Invalid password for user - ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Access Token (디바이스별) + Refresh Token (7일) 생성
    const accessToken = this.tokenService.generateAccessToken(user, deviceType);
    const refreshToken = await this.tokenService.generateRefreshToken(user.id);

    // 비밀번호 제거
    const { password: _, ...userWithoutPassword } = user;

    this.logger.log(`User signed in successfully: ${user.id} (${email}, ${deviceType})`);
    return { 
      accessToken, 
      refreshToken,
      user: userWithoutPassword as User 
    };
  }

  async refreshToken(
    refreshToken: string, 
    deviceType: 'mobile' | 'desktop' = 'desktop'
  ): Promise<{ accessToken: string; refreshToken: string }> {
    this.logger.log(`Token refresh attempt (device: ${deviceType})`);
    
    const user = await this.tokenService.verifyRefreshToken(refreshToken);
    
    // 새 Access Token (디바이스별) + Refresh Token 발급
    const newAccessToken = this.tokenService.generateAccessToken(user, deviceType);
    const newRefreshToken = await this.tokenService.generateRefreshToken(user.id);

    this.logger.log(`Token refreshed for user: ${user.id} (${deviceType})`);
    return { 
      accessToken: newAccessToken, 
      refreshToken: newRefreshToken 
    };
  }

  async logout(refreshToken: string): Promise<void> {
    this.logger.log('Logout attempt');
    await this.tokenService.revokeRefreshToken(refreshToken);
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findByEmail(email);
  }

  async getAllUsers(): Promise<User[]> {
    const users = await this.userRepository.findAll();
    
    // 비밀번호 제거
    return users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    });
  }

  async searchUsers(
    query: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ users: User[]; total: number }> {
    this.logger.log(`🔍 Searching users with query: "${query}" (limit: ${limit}, offset: ${offset})`);
    
    if (!query || query.trim().length === 0) {
      this.logger.warn('❌ Empty search query');
      return { users: [], total: 0 };
    }

    const result = await this.userRepository.searchUsers(query, limit, offset);
    
    this.logger.log(`✅ Found ${result.total} users matching "${query}"`);
    this.logger.debug(`📋 Users: ${result.users.map(u => `${u.name}(${u.email})`).join(', ')}`);
    
    // 비밀번호 제거
    result.users = result.users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    });
    
    return result;
  }

  // 친구 요청 관련 메서드
  async sendFriendRequest(requesterId: string, addresseeId: string): Promise<Friend> {
    this.logger.log(`Friend request: ${requesterId} -> ${addresseeId}`);
    
    if (requesterId === addresseeId) {
      throw new ConflictException('Cannot send friend request to yourself');
    }

    const addressee = await this.userRepository.findById(addresseeId);
    if (!addressee) {
      throw new NotFoundException('User not found');
    }

    return await this.friendRepository.sendFriendRequest(requesterId, addresseeId);
  }

  async acceptFriendRequest(friendId: string, userId: string): Promise<Friend> {
    this.logger.log(`Accepting friend request: ${friendId} by user: ${userId}`);
    
    const friendRequest = await this.friendRepository.getFriendRequest(userId, userId);
    // 실제로는 friendId로 조회해서 addresseeId가 userId인지 확인해야 함
    
    return await this.friendRepository.updateFriendStatus(friendId, FriendStatus.ACCEPTED);
  }

  async rejectFriendRequest(friendId: string, userId: string): Promise<Friend> {
    this.logger.log(`Rejecting friend request: ${friendId} by user: ${userId}`);
    
    return await this.friendRepository.updateFriendStatus(friendId, FriendStatus.REJECTED);
  }

  async getPendingRequests(userId: string): Promise<Friend[]> {
    const requests = await this.friendRepository.getPendingRequests(userId);
    
    // 비밀번호 제거
    return requests.map(request => {
      if (request.requester) {
        const { password, ...requesterWithoutPassword } = request.requester;
        request.requester = requesterWithoutPassword as any;
      }
      if (request.addressee) {
        const { password, ...addresseeWithoutPassword } = request.addressee;
        request.addressee = addresseeWithoutPassword as any;
      }
      return request;
    });
  }

  async getSentRequests(userId: string): Promise<Friend[]> {
    const requests = await this.friendRepository.getSentRequests(userId);
    
    // 비밀번호 제거
    return requests.map(request => {
      if (request.requester) {
        const { password, ...requesterWithoutPassword } = request.requester;
        request.requester = requesterWithoutPassword as any;
      }
      if (request.addressee) {
        const { password, ...addresseeWithoutPassword } = request.addressee;
        request.addressee = addresseeWithoutPassword as any;
      }
      return request;
    });
  }

  async getFriends(userId: string): Promise<Friend[]> {
    const friends = await this.friendRepository.getFriends(userId);
    
    // 비밀번호 제거
    return friends.map(friend => {
      if (friend.requester) {
        const { password, ...requesterWithoutPassword } = friend.requester;
        friend.requester = requesterWithoutPassword as any;
      }
      if (friend.addressee) {
        const { password, ...addresseeWithoutPassword } = friend.addressee;
        friend.addressee = addresseeWithoutPassword as any;
      }
      return friend;
    });
  }

  async deleteFriendRequest(friendId: string): Promise<void> {
    await this.friendRepository.deleteFriendRequest(friendId);
  }
}
