import { HttpService } from '@nestjs/axios';
import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError, Method } from 'axios';
import { Request, Response } from 'express';
import { firstValueFrom } from 'rxjs';
import {
  REQUEST_ID_HEADER,
  USER_EMAIL_HEADER,
  USER_ID_HEADER,
} from '../common/constants';
import { AuthenticatedUser } from '../common/types/authenticated-user';

type UpstreamService = 'auth' | 'order' | 'catalog';

export type RequestWithUser = Request & {
  user?: AuthenticatedUser;
};

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
]);

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async forward(
    service: UpstreamService,
    request: RequestWithUser,
    response: Response,
  ) {
    const targetUrl = `${this.getServiceBaseUrl(service)}${request.originalUrl}`;
    const headers = this.buildForwardHeaders(request);

    try {
      const upstreamResponse = await firstValueFrom(
        this.httpService.request({
          method: request.method as Method,
          url: targetUrl,
          headers,
          params: request.query,
          data: request.body,
          validateStatus: () => true,
          timeout: this.configService.get<number>('HTTP_CLIENT_TIMEOUT_MS', 10000),
          responseType: 'arraybuffer',
        }),
      );

      this.forwardResponseHeaders(upstreamResponse.headers, response);
      response.status(upstreamResponse.status).send(upstreamResponse.data);
    } catch (error) {
      this.handleProxyError(error, service, targetUrl);
    }
  }

  private getServiceBaseUrl(service: UpstreamService) {
    if (service === 'auth') {
      return this.configService
        .getOrThrow<string>('AUTH_SERVICE_URL')
        .replace(/\/$/, '');
    }

    if (service === 'order') {
      return this.configService
        .getOrThrow<string>('ORDER_SERVICE_URL')
        .replace(/\/$/, '');
    }

    if (service === 'catalog') {
      return this.configService
        .getOrThrow<string>('CATALOG_SERVICE_URL')
        .replace(/\/$/, '');
    }

    throw new ServiceUnavailableException(`Unknown upstream service: ${service}`);
  }

  private buildForwardHeaders(request: RequestWithUser) {
    const headers: Record<string, string> = {};

    for (const [key, value] of Object.entries(request.headers)) {
      if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
        continue;
      }

      if (value === undefined) {
        continue;
      }

      headers[key] = Array.isArray(value) ? value.join(',') : String(value);
    }

    const requestId = request.header(REQUEST_ID_HEADER);
    if (requestId) {
      headers[REQUEST_ID_HEADER] = requestId;
    }

    if (request.user) {
      headers[USER_ID_HEADER] = request.user.userId;
      headers[USER_EMAIL_HEADER] = request.user.email;
    }

    return headers;
  }

  private forwardResponseHeaders(
    upstreamHeaders: Record<string, unknown>,
    response: Response,
  ) {
    for (const [key, value] of Object.entries(upstreamHeaders)) {
      if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
        continue;
      }

      if (value === undefined || value === null) {
        continue;
      }

      response.setHeader(
        key,
        Array.isArray(value) ? value.map(String) : String(value),
      );
    }
  }

  private handleProxyError(
    error: unknown,
    service: UpstreamService,
    targetUrl: string,
  ): never {
    if (error instanceof AxiosError) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        this.logger.error(
          `Upstream ${service} is unavailable for ${targetUrl}`,
        );
        throw new ServiceUnavailableException(
          `Upstream service "${service}" is unavailable`,
        );
      }
    }

    this.logger.error(`Proxy request failed for ${targetUrl}`, error);
    throw new BadGatewayException('Failed to reach upstream service');
  }
}
