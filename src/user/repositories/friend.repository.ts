import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Friend, FriendStatus } from '../entities/friend.entity';

export interface IFriendRepository {
  sendFriendRequest(requesterId: string, addresseeId: string): Promise<Friend>;
  getFriendRequest(requesterId: string, addresseeId: string): Promise<Friend | null>;
  updateFriendStatus(friendId: string, status: FriendStatus): Promise<Friend>;
  getPendingRequests(userId: string): Promise<Friend[]>;
  getSentRequests(userId: string): Promise<Friend[]>;
  getFriends(userId: string): Promise<Friend[]>;
  areFriends(userId1: string, userId2: string): Promise<boolean>;
  deleteFriendRequest(friendId: string): Promise<void>;
}

@Injectable()
export class PostgresFriendRepository implements IFriendRepository {
  private readonly logger = new Logger(PostgresFriendRepository.name);

  constructor(
    @InjectRepository(Friend)
    private readonly friendRepository: Repository<Friend>,
  ) {}

  async sendFriendRequest(requesterId: string, addresseeId: string): Promise<Friend> {
    this.logger.log(`Sending friend request from ${requesterId} to ${addresseeId}`);
    
    // 자기 자신에게 요청 방지
    if (requesterId === addresseeId) {
      this.logger.warn('Cannot send friend request to yourself');
      throw new Error('Cannot send friend request to yourself');
    }

    // 이미 요청이 있는지 확인
    const existing = await this.friendRepository.findOne({
      where: [
        { requesterId, addresseeId },
        { requesterId: addresseeId, addresseeId: requesterId },
      ],
    });

    if (existing) {
      this.logger.debug(`Friend request already exists: ${existing.id} (status: ${existing.status})`);
      return existing;
    }

    // 명시적으로 모든 필드 전달
    const friendRequest = this.friendRepository.create({
      requesterId: requesterId,
      addresseeId: addresseeId,
      status: FriendStatus.PENDING,
    });

    this.logger.debug(`Creating friend request: ${JSON.stringify({ requesterId, addresseeId })}`);
    
    const saved = await this.friendRepository.save(friendRequest);
    this.logger.log(`Friend request created: ${saved.id}`);
    return saved;
  }

  async getFriendRequest(requesterId: string, addresseeId: string): Promise<Friend | null> {
    this.logger.debug(`Getting friend request from ${requesterId} to ${addresseeId}`);
    
    return await this.friendRepository.findOne({
      where: [
        { requesterId, addresseeId },
        { requesterId: addresseeId, addresseeId: requesterId },
      ],
      relations: ['requester', 'addressee'],
    });
  }

  async updateFriendStatus(friendId: string, status: FriendStatus): Promise<Friend> {
    this.logger.log(`Updating friend request ${friendId} to status: ${status}`);
    
    const friendRequest = await this.friendRepository.findOne({
      where: { id: friendId },
    });

    if (!friendRequest) {
      this.logger.warn(`Friend request not found: ${friendId}`);
      throw new Error('Friend request not found');
    }

    friendRequest.status = status;
    const updated = await this.friendRepository.save(friendRequest);
    this.logger.log(`Friend request ${friendId} updated to ${status}`);
    return updated;
  }

  async getPendingRequests(userId: string): Promise<Friend[]> {
    this.logger.debug(`Getting pending requests for user: ${userId}`);
    
    return await this.friendRepository.find({
      where: {
        addresseeId: userId,
        status: FriendStatus.PENDING,
      },
      relations: ['requester'],
      order: { createdAt: 'DESC' },
    });
  }

  async getSentRequests(userId: string): Promise<Friend[]> {
    this.logger.debug(`Getting sent requests for user: ${userId}`);
    
    return await this.friendRepository.find({
      where: {
        requesterId: userId,
        status: FriendStatus.PENDING,
      },
      relations: ['addressee'],
      order: { createdAt: 'DESC' },
    });
  }

  async getFriends(userId: string): Promise<Friend[]> {
    this.logger.debug(`Getting friends for user: ${userId}`);
    
    const friends = await this.friendRepository
      .createQueryBuilder('friend')
      .where(
        '(friend.requesterId = :userId OR friend.addresseeId = :userId) AND friend.status = :status',
        { userId, status: FriendStatus.ACCEPTED },
      )
      .leftJoinAndSelect('friend.requester', 'requester')
      .leftJoinAndSelect('friend.addressee', 'addressee')
      .orderBy('friend.updatedAt', 'DESC')
      .getMany();

    this.logger.debug(`Found ${friends.length} friends for user: ${userId}`);
    return friends;
  }

  async areFriends(userId1: string, userId2: string): Promise<boolean> {
    const friendship = await this.friendRepository.findOne({
      where: [
        { requesterId: userId1, addresseeId: userId2, status: FriendStatus.ACCEPTED },
        { requesterId: userId2, addresseeId: userId1, status: FriendStatus.ACCEPTED },
      ],
    });

    return !!friendship;
  }

  async deleteFriendRequest(friendId: string): Promise<void> {
    this.logger.log(`Deleting friend request: ${friendId}`);
    await this.friendRepository.delete(friendId);
  }
}

