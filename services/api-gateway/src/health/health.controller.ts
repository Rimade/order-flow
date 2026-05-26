import { HttpService } from '@nestjs/axios';
import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthCheck,
  HealthCheckError,
  HealthCheckService,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { firstValueFrom } from 'rxjs';
import { Public } from '../common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  @Public()
  @Get()
  @HealthCheck()
  check() {
    const authServiceUrl = this.configService
      .getOrThrow<string>('AUTH_SERVICE_URL')
      .replace(/\/$/, '');

    return this.health.check([
      () => this.getGatewayHealth(),
      () => this.pingAuthService(authServiceUrl),
    ]);
  }

  private getGatewayHealth(): HealthIndicatorResult {
    return {
      gateway: {
        status: 'up',
      },
    };
  }

  private async pingAuthService(
    authServiceUrl: string,
  ): Promise<HealthIndicatorResult> {
    try {
      await firstValueFrom(
        this.httpService.get(`${authServiceUrl}/health`, {
          validateStatus: (status) => status === 200,
        }),
      );

      return {
        'auth-service': {
          status: 'up',
        },
      };
    } catch {
      throw new HealthCheckError('Auth service check failed', {
        'auth-service': {
          status: 'down',
        },
      });
    }
  }
}
