import { All, Controller, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ProxyService, RequestWithUser } from './proxy.service';

@Controller('orders')
export class OrdersProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @All()
  proxyOrdersRoot(
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
  proxyOrders(
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
