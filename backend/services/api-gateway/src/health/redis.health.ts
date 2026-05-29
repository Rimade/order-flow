import { Inject, Injectable } from '@nestjs/common';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis | null) {
    super();
  }

  async isHealthy(key = 'redis'): Promise<HealthIndicatorResult> {
    if (!this.redis) {
      return this.getStatus(key, true, { mode: 'memory' });
    }

    try {
      if (this.redis.status !== 'ready') {
        await this.redis.connect();
      }

      const pong = await this.redis.ping();
      if (pong !== 'PONG') {
        throw new Error('unexpected ping response');
      }

      return this.getStatus(key, true, { mode: 'redis' });
    } catch (error) {
      throw new HealthCheckError(
        'Redis check failed',
        this.getStatus(key, false, {
          message: error instanceof Error ? error.message : 'unknown error',
        }),
      );
    }
  }
}
