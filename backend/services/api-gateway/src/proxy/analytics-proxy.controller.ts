import { All, Controller, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ProxyService, RequestWithUser } from './proxy.service';

/** Proxies /api/v1/analytics/* → analytics-service */
@Controller('analytics')
export class AnalyticsProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @All()
  proxyAnalyticsRoot(
    @Req() request: Request,
    @Res({ passthrough: false }) response: Response,
  ) {
    return this.proxyService.forward(
      'analytics',
      request as RequestWithUser,
      response,
    );
  }

  @All('*path')
  proxyAnalytics(
    @Req() request: Request,
    @Res({ passthrough: false }) response: Response,
  ) {
    return this.proxyService.forward(
      'analytics',
      request as RequestWithUser,
      response,
    );
  }
}
