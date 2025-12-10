import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { FriendController } from './friend.controller';
import { DeviceController } from './device.controller';
import { UserService } from './user.service';
import { DeviceService } from './device.service';
import { User, Friend } from './entities';
import { UserDevice } from './entities/user-device.entity';
import { PostgresUserRepository, MemoryUserRepository } from './repositories/user.repository';
import { PostgresFriendRepository } from './repositories/friend.repository';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Friend, UserDevice]),
    forwardRef(() => AuthModule),
  ],
  controllers: [UserController, FriendController, DeviceController],
  providers: [
    UserService,
    DeviceService,
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
  exports: [UserService, DeviceService, 'USER_REPOSITORY'],
})
export class UserModule {}
