import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types/jwt-payload';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatusSseService } from './order-status-sse.service';
import { OrdersService } from './orders.service';

type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly orderStatusSse: OrderStatusSseService,
  ) {}

  @Post()
  @HttpCode(201)
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateOrderDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.ordersService.create(request.user.userId, dto, idempotencyKey);
  }

  @Get()
  findAll(@Req() request: AuthenticatedRequest) {
    return this.ordersService.findAllByUser(request.user.userId);
  }

  @Get(':id/events')
  streamEvents(
    @Req() request: AuthenticatedRequest,
    @Param('id') orderId: string,
    @Res({ passthrough: false }) response: Response,
  ) {
    return this.orderStatusSse.stream(request.user.userId, orderId, response);
  }

  @Get(':id')
  findOne(@Req() request: AuthenticatedRequest, @Param('id') orderId: string) {
    return this.ordersService.findOne(request.user.userId, orderId);
  }
}
