import {
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Put,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { ProxyService, RequestWithUser } from './proxy.service';

@Controller('catalog')
export class CatalogProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @Public()
  @Get()
  proxyCatalogGetRoot(
    @Req() request: Request,
    @Res({ passthrough: false }) response: Response,
  ) {
    return this.forward(request, response);
  }

  @Public()
  @Get('*path')
  proxyCatalogGetPath(
    @Req() request: Request,
    @Res({ passthrough: false }) response: Response,
  ) {
    return this.forward(request, response);
  }

  @Post()
  proxyCatalogPostRoot(
    @Req() request: Request,
    @Res({ passthrough: false }) response: Response,
  ) {
    return this.forward(request, response);
  }

  @Post('*path')
  proxyCatalogPostPath(
    @Req() request: Request,
    @Res({ passthrough: false }) response: Response,
  ) {
    return this.forward(request, response);
  }

  @Patch()
  proxyCatalogPatchRoot(
    @Req() request: Request,
    @Res({ passthrough: false }) response: Response,
  ) {
    return this.forward(request, response);
  }

  @Patch('*path')
  proxyCatalogPatchPath(
    @Req() request: Request,
    @Res({ passthrough: false }) response: Response,
  ) {
    return this.forward(request, response);
  }

  @Put()
  proxyCatalogPutRoot(
    @Req() request: Request,
    @Res({ passthrough: false }) response: Response,
  ) {
    return this.forward(request, response);
  }

  @Put('*path')
  proxyCatalogPutPath(
    @Req() request: Request,
    @Res({ passthrough: false }) response: Response,
  ) {
    return this.forward(request, response);
  }

  @Delete()
  proxyCatalogDeleteRoot(
    @Req() request: Request,
    @Res({ passthrough: false }) response: Response,
  ) {
    return this.forward(request, response);
  }

  @Delete('*path')
  proxyCatalogDeletePath(
    @Req() request: Request,
    @Res({ passthrough: false }) response: Response,
  ) {
    return this.forward(request, response);
  }

  private forward(request: Request, response: Response) {
    return this.proxyService.forward(
      'catalog',
      request as RequestWithUser,
      response,
    );
  }
}
