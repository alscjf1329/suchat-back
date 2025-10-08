import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { PostgresUserRepository, MemoryUserRepository } from './repositories/user.repository';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    AuthModule,
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
  ],
  exports: [UserService, 'USER_REPOSITORY'],
})
export class UserModule {}
