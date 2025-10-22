import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

export interface IUserRepository {
  create(userData: Partial<User>): Promise<User>;
  findByEmail(email: string, withPassword?: boolean): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  update(id: string, userData: Partial<User>): Promise<User>;
  delete(id: string): Promise<boolean>;
  searchUsers(query: string, limit?: number, offset?: number): Promise<{ users: User[]; total: number }>;
}

@Injectable()
export class PostgresUserRepository implements IUserRepository {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(userData: Partial<User>): Promise<User> {
    const user = this.userRepository.create(userData);
    return await this.userRepository.save(user);
  }

  async findByEmail(email: string, withPassword: boolean = false): Promise<User | null> {
    if (withPassword) {
      // 로그인 시 password 필드 필요
      return await this.userRepository.findOne({ 
        where: { email },
        select: ['id', 'name', 'email', 'password', 'phone', 'birthday', 'isActive', 'lastLoginAt', 'createdAt', 'updatedAt']
      });
    }
    return await this.userRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { id } });
  }

  async findAll(): Promise<User[]> {
    return await this.userRepository.find({
      order: { createdAt: 'DESC' },
      take: 100, // 최대 100명까지
    });
  }

  async update(id: string, userData: Partial<User>): Promise<User> {
    await this.userRepository.update(id, userData);
    const user = await this.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.userRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async searchUsers(
    query: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ users: User[]; total: number }> {
    console.log(`[PostgresUserRepository] 검색 쿼리: "${query}"`);
    
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .where('LOWER(user.name) LIKE LOWER(:query)', { query: `%${query}%` })
      .orWhere('LOWER(user.email) LIKE LOWER(:query)', { query: `%${query}%` })
      .orderBy('user.name', 'ASC')
      .skip(offset)
      .take(limit);

    const [users, total] = await queryBuilder.getManyAndCount();

    console.log(`[PostgresUserRepository] 결과: ${total}명 (${users.map(u => u.email).join(', ')})`);

    return { users, total };
  }
}

@Injectable()
export class MemoryUserRepository implements IUserRepository {
  private users: User[] = [];

  async create(userData: Partial<User>): Promise<User> {
    const user = new User();
    Object.assign(user, {
      id: this.generateId(),
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    this.users.push(user);
    return user;
  }

  async findByEmail(email: string, withPassword: boolean = false): Promise<User | null> {
    return this.users.find(user => user.email === email) || null;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.find(user => user.id === id) || null;
  }

  async findAll(): Promise<User[]> {
    return [...this.users].sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    ).slice(0, 100);
  }

  async update(id: string, userData: Partial<User>): Promise<User> {
    const userIndex = this.users.findIndex(user => user.id === id);
    if (userIndex === -1) {
      throw new Error('User not found');
    }
    
    this.users[userIndex] = {
      ...this.users[userIndex],
      ...userData,
      updatedAt: new Date(),
    };
    
    return this.users[userIndex];
  }

  async delete(id: string): Promise<boolean> {
    const userIndex = this.users.findIndex(user => user.id === id);
    if (userIndex === -1) {
      return false;
    }
    
    this.users.splice(userIndex, 1);
    return true;
  }

  async searchUsers(
    query: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ users: User[]; total: number }> {
    const lowerQuery = query.toLowerCase();
    const filtered = this.users.filter(user => 
      user.name.toLowerCase().includes(lowerQuery) ||
      user.email.toLowerCase().includes(lowerQuery)
    ).sort((a, b) => a.name.localeCompare(b.name));

    const total = filtered.length;
    const users = filtered.slice(offset, offset + limit);

    return { users, total };
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}
