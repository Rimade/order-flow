import { Injectable, Logger } from '@nestjs/common';
import http from 'node:http';
import https from 'node:https';
import type { Response } from 'express';
import { ProxyService, RequestWithUser } from './proxy.service';

/**
 * Streaming proxy for SSE / long-lived responses.
 * Axios path buffers the body and applies HTTP_CLIENT_TIMEOUT_MS — unsuitable for SSE.
 */
@Injectable()
export class ProxyStreamService {
  private readonly logger = new Logger(ProxyStreamService.name);

  constructor(private readonly proxyService: ProxyService) {}

  forwardStream(
    service: 'order',
    request: RequestWithUser,
    response: Response,
  ): void {
    const baseUrl = this.proxyService.getServiceBaseUrl(service);
    const targetUrl = new URL(`${baseUrl}${request.originalUrl}`);
    const headers = this.proxyService.buildForwardHeaders(request);
    const transport = targetUrl.protocol === 'https:' ? https : http;

    const upstream = transport.request(
      {
        protocol: targetUrl.protocol,
        hostname: targetUrl.hostname,
        port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
        path: `${targetUrl.pathname}${targetUrl.search}`,
        method: 'GET',
        headers,
        timeout: 0,
      },
      (upstreamRes) => {
        response.status(upstreamRes.statusCode ?? 502);
        for (const [key, value] of Object.entries(upstreamRes.headers)) {
          if (value === undefined) continue;
          const lower = key.toLowerCase();
          if (
            lower === 'transfer-encoding' ||
            lower === 'connection' ||
            lower === 'keep-alive'
          ) {
            continue;
          }
          response.setHeader(key, value);
        }
        response.setHeader('Cache-Control', 'no-cache, no-transform');
        response.setHeader('X-Accel-Buffering', 'no');
        upstreamRes.pipe(response);
      },
    );

    upstream.on('error', (error) => {
      this.logger.error(`SSE proxy failed for ${targetUrl.href}`, error);
      if (!response.headersSent) {
        response.status(503).json({
          message: `Upstream service "${service}" is unavailable`,
          statusCode: 503,
        });
      } else {
        response.end();
      }
    });

    request.on('close', () => {
      upstream.destroy();
    });

    upstream.end();
  }
}
