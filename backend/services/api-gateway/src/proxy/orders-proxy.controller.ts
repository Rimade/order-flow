import { All, Controller, Get, Param, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ProxyStreamService } from './proxy-stream.service';
import { ProxyService, RequestWithUser } from './proxy.service';

@Controller('orders')
export class OrdersProxyController {
  constructor(
    private readonly proxyService: ProxyService,
    private readonly proxyStreamService: ProxyStreamService,
  ) {}

  /** SSE — must not go through axios buffer proxy */
  @Get(':id/events')
  proxyOrderEvents(
    @Param('id') _id: string,
    @Req() request: Request,
    @Res({ passthrough: false }) response: Response,
  ) {
    this.proxyStreamService.forwardStream(
      'order',
      request as RequestWithUser,
      response,
    );
  }

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
