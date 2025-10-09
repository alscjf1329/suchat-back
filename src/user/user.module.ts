import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User, Friend } from './entities';
import { PostgresUserRepository, MemoryUserRepository } from './repositories/user.repository';
import { PostgresFriendRepository } from './repositories/friend.repository';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Friend]),
    forwardRef(() => AuthModule),
  ],
  controllers: [UserController],
  providers: [
    UserService,
    {
      provide: 'USER_REPOSITORY',
      useClass: process.env.USE_MEMORY_DB === 'true' 
        ? MemoryUserRepository 
        : PostgresUserRepository,
    },
    {
      provide: 'IUserRepository',
      useClass: process.env.USE_MEMORY_DB === 'true' 
        ? MemoryUserRepository 
        : PostgresUserRepository,
    },
    {
      provide: 'IFriendRepository',
      useClass: PostgresFriendRepository,
    },
  ],
  exports: [UserService, 'USER_REPOSITORY'],
})
export class UserModule {}
