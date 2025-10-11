import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatModule } from './chat/chat.module';
import { FileModule } from './file/file.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { PushModule } from './push/push.module';
import { BullConfigModule } from './queues/bull.config';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';
import pushConfig from './config/push.config';

// dotenv를 직접 로드
require('dotenv').config();

// 환경변수 검증
function validateEnvironment() {
  const requiredEnvVars = [
    'JWT_SECRET',
    'VAPID_PUBLIC_KEY',
    'VAPID_PRIVATE_KEY'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ 필수 환경변수가 누락되었습니다:', missingVars.join(', '));
    console.error('.env 파일을 확인하고 누락된 환경변수를 추가해주세요.');
    process.exit(1);
  }
}

// 서버 시작 전 환경변수 검증
validateEnvironment();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, pushConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule.forFeature(databaseConfig)],
      useFactory: (configService: ConfigService) => configService.get('database') as TypeOrmModuleOptions,
      inject: [ConfigService],
    }),
    BullConfigModule,
    ChatModule,
    FileModule,
    UserModule,
    AuthModule,
    PushModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
