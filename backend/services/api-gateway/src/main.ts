import { initTracing } from './telemetry/tracing';

initTracing(process.env.OTEL_SERVICE_NAME ?? 'api-gateway');

import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { loadGatewayOpenApi } from './openapi/load-openapi';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.use(
    helmet({
      // Swagger UI loads inline scripts
      contentSecurityPolicy: false,
    }),
  );
  app.enableCors({
    origin: [
      'http://localhost:4000',
      'http://localhost:4101',
      'http://localhost:4102',
      'http://localhost:4103',
    ],
    credentials: true,
  });
  const httpAdapter = app.getHttpAdapter().getInstance();
  if (typeof httpAdapter.set === 'function') {
    httpAdapter.set('trust proxy', 1);
  }
  app.enableShutdownHooks();

  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: 'health', method: RequestMethod.ALL },
      { path: 'metrics', method: RequestMethod.ALL },
      { path: 'docs', method: RequestMethod.ALL },
      { path: 'docs-json', method: RequestMethod.ALL },
      { path: 'docs/(.*)', method: RequestMethod.ALL },
    ],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  try {
    const document = loadGatewayOpenApi();
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  } catch (error) {
    // Dev should not die if yaml path is wrong — log and continue
    console.error('Swagger UI not mounted:', error);
  }

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);

  await app.listen(port);
}

void bootstrap();
