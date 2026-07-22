import { All, Controller, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ProxyService, RequestWithUser } from './proxy.service';

/** Proxies /api/v1/ops/* → order-service (outbox admin) */
@Controller('ops')
export class OpsProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @All()
  proxyOpsRoot(
    @Req() request: Request,
    @Res({ passthrough: false }) response: Response,
  ) {
    return this.proxyService.forward(
      'order',
      request as RequestWithUser,
      response,
    );
  }

  @All('*path')
  proxyOps(
    @Req() request: Request,
    @Res({ passthrough: false }) response: Response,
  ) {
    return this.proxyService.forward(
      'order',
      request as RequestWithUser,
      response,
    );
  }
}
