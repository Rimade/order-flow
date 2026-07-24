import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, finalize } from 'rxjs';
import { httpRequestDuration, httpRequestsTotal } from './metrics.registry';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    if (request.path === '/metrics' || request.path === '/health') {
      return next.handle();
    }

    const started = process.hrtime.bigint();

    return next.handle().pipe(
      finalize(() => {
        this.record(request, response.statusCode || 500, started);
      }),
    );
  }

  private record(request: Request, statusCode: number, started: bigint) {
    const path = request.route?.path ?? request.path;

    httpRequestsTotal.inc({
      service: 'catalog-service',
      method: request.method,
      path,
      status: String(statusCode),
    });

    httpRequestDuration.observe(
      {
        service: 'catalog-service',
        method: request.method,
        path,
      },
      Number(process.hrtime.bigint() - started) / 1e9,
    );
  }
}
