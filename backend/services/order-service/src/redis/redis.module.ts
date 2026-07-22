import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';
import { RedisLifecycle } from './redis.lifecycle';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    RedisLifecycle,
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Redis | null => {
        if (configService.get<string>('IDEMPOTENCY_ENABLED', 'true') === 'false') {
          return null;
        }

        return new Redis(
          configService.get<string>('REDIS_URL', 'redis://localhost:6379'),
          {
            maxRetriesPerRequest: 1,
            lazyConnect: true,
          },
        );
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
