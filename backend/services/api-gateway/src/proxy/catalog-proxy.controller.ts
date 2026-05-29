import { All, Controller, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { ProxyService, RequestWithUser } from './proxy.service';

@Controller('catalog')
@Public()
export class CatalogProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @All()
  proxyCatalogRoot(
    @Req() request: Request,
    @Res({ passthrough: false }) response: Response,
  ) {
    return this.proxyService.forward(
      'catalog',
      request as RequestWithUser,
      response,
    );
  }

  @All('*path')
  proxyCatalog(
    @Req() request: Request,
    @Res({ passthrough: false }) response: Response,
  ) {
    return this.proxyService.forward(
      'catalog',
      request as RequestWithUser,
      response,
    );
  }
}
