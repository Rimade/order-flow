import {
  ConflictException,
  Inject,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';

type IdemRecord =
  | { state: 'processing'; fingerprint: string }
  | { state: 'completed'; fingerprint: string; body: unknown };

@Injectable()
export class IdempotencyService {
  private readonly ttlSeconds: number;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis | null,
    configService: ConfigService,
  ) {
    this.ttlSeconds = configService.get<number>('IDEMPOTENCY_TTL_SECONDS', 86_400);
  }

  isEnabled() {
    return this.redis !== null;
  }

  fingerprint(payload: unknown) {
    return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }

  private redisKey(userId: string, key: string) {
    return `order:idem:${userId}:${key}`;
  }

  async begin(userId: string, key: string, fingerprint: string): Promise<unknown | null> {
    if (!this.redis) {
      return null;
    }

    await this.ensureConnected();
    const redisKey = this.redisKey(userId, key);
    const existingRaw = await this.redis.get(redisKey);

    if (existingRaw) {
      return this.handleExisting(existingRaw, fingerprint);
    }

    const placeholder: IdemRecord = { state: 'processing', fingerprint };
    const set = await this.redis.set(
      redisKey,
      JSON.stringify(placeholder),
      'EX',
      this.ttlSeconds,
      'NX',
    );

    if (set !== 'OK') {
      const raced = await this.redis.get(redisKey);
      if (raced) {
        return this.handleExisting(raced, fingerprint);
      }
      throw new ConflictException('Idempotency key is already in use');
    }

    return null;
  }

  async complete(userId: string, key: string, fingerprint: string, body: unknown) {
    if (!this.redis) {
      return;
    }

    await this.ensureConnected();
    const record: IdemRecord = { state: 'completed', fingerprint, body };
    await this.redis.set(
      this.redisKey(userId, key),
      JSON.stringify(record),
      'EX',
      this.ttlSeconds,
    );
  }

  async release(userId: string, key: string) {
    if (!this.redis) {
      return;
    }

    await this.ensureConnected();
    await this.redis.del(this.redisKey(userId, key));
  }

  private handleExisting(raw: string, fingerprint: string): unknown {
    let record: IdemRecord;
    try {
      record = JSON.parse(raw) as IdemRecord;
    } catch {
      throw new ConflictException('Corrupt idempotency record');
    }

    if (record.fingerprint !== fingerprint) {
      throw new UnprocessableEntityException(
        'Idempotency-Key was reused with a different request body',
      );
    }

    if (record.state === 'completed') {
      return record.body;
    }

    throw new ConflictException('Request with this Idempotency-Key is already in progress');
  }

  private async ensureConnected() {
    if (!this.redis) {
      return;
    }
    if (this.redis.status === 'wait') {
      await this.redis.connect();
    }
  }
}
