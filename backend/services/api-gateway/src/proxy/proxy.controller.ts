import { All, Controller, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ProxyService, RequestWithUser } from './proxy.service';

@Controller('auth')
export class ProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @All()
  proxyAuthRoot(
    @Req() request: Request,
    @Res({ passthrough: false }) response: Response,
  ) {
    return this.proxyService.forward(
      'auth',
      request as RequestWithUser,
      response,
    );
  }

  @All('*path')
  proxyAuth(
    @Req() request: Request,
    @Res({ passthrough: false }) response: Response,
  ) {
    return this.proxyService.forward(
      'auth',
      request as RequestWithUser,
      response,
    );
  }
}
