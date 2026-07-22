import { Injectable } from '@nestjs/common';
import type { Response } from 'express';
import { OrdersService } from './orders.service';

const TERMINAL = new Set(['CONFIRMED', 'CANCELLED', 'FAILED']);

@Injectable()
export class OrderStatusSseService {
  constructor(private readonly ordersService: OrdersService) {}

  async stream(userId: string, orderId: string, response: Response) {
    // Ownership check — throws NotFoundException if missing
    await this.ordersService.findOne(userId, orderId);

    response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no');
    response.flushHeaders?.();

    let lastStatus: string | null = null;
    let closed = false;

    const writeEvent = (payload: unknown) => {
      if (closed || response.writableEnded) return;
      response.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    const tick = async () => {
      if (closed) return;
      try {
        const order = await this.ordersService.findOne(userId, orderId);
        if (order.status !== lastStatus) {
          lastStatus = order.status;
          writeEvent({
            orderId: order.id,
            status: order.status,
            updatedAt: order.updatedAt,
          });
        }
        if (TERMINAL.has(order.status)) {
          cleanup();
          response.end();
        }
      } catch {
        cleanup();
        if (!response.writableEnded) {
          response.end();
        }
      }
    };

    const interval = setInterval(() => {
      void tick();
    }, 1500);

    const cleanup = () => {
      if (closed) return;
      closed = true;
      clearInterval(interval);
    };

    response.on('close', cleanup);

    await tick();
  }
}
