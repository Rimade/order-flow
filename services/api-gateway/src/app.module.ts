import { HttpModule } from '@nestjs/axios';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import Redis from 'ioredis';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { validateEnv } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { ProxyModule } from './proxy/proxy.module';
import { REDIS_CLIENT } from './redis/redis.constants';
import { RedisModule } from './redis/redis.module';
import { GatewayThrottlerGuard } from './throttler/gateway-throttler.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    RedisModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService, REDIS_CLIENT],
      useFactory: (configService: ConfigService, redis: Redis | null) => {
        const throttlers = [
          {
            ttl: configService.get<number>('THROTTLE_TTL_MS', 60000),
            limit: configService.get<number>('THROTTLE_LIMIT', 100),
          },
        ];

        if (redis) {
          return {
            throttlers,
            storage: new ThrottlerStorageRedisService(redis),
          };
        }

        return { throttlers };
      },
    }),
    HttpModule,
    AuthModule,
    HealthModule,
    ProxyModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: GatewayThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
