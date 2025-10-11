import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import { PushService } from './push.service';
import { PushProcessor } from './push.processor';
import { PushController } from './push.controller';
import { PushSubscription } from './entities/push-subscription.entity';
import pushConfig from '../config/push.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([PushSubscription]),
    ConfigModule.forFeature(pushConfig),
    BullModule.registerQueue({
      name: 'push-notifications',
    }),
  ],
  controllers: [PushController],
  providers: [PushService, PushProcessor],
  exports: [PushService], // 다른 모듈에서 사용 가능
})
export class PushModule {}

