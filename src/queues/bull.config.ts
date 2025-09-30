import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import redisConfig from '../config/redis.config';

export const BullConfigModule = BullModule.forRootAsync({
  imports: [ConfigModule.forFeature(redisConfig)],
  useFactory: async (configService: ConfigService) => ({
    redis: {
      host: configService.get<string>('redis.host'),
      port: configService.get<number>('redis.port'),
      password: configService.get<string>('redis.password'),
    },
  }),
  inject: [ConfigService],
});
