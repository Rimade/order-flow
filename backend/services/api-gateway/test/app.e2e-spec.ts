import {
  INestApplication,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { HttpService } from '@nestjs/axios';
import { AppModule } from './../src/app.module';
import { RedisHealthIndicator } from './../src/health/redis.health';

describe('ApiGateway (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    process.env.THROTTLE_STORAGE = 'memory';
    process.env.NODE_ENV = 'test';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(RedisHealthIndicator)
      .useValue({
        isHealthy: async () => ({
          redis: { status: 'up', mode: 'memory' },
        }),
      })
      .overrideProvider(HttpService)
      .useValue({
        get: () =>
          of({
            status: 200,
            data: { status: 'ok' },
            statusText: 'OK',
            headers: {},
            config: {},
          }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1', {
      exclude: [{ path: 'health', method: RequestMethod.ALL }],
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer()).get('/health').expect(200);
  });
});
