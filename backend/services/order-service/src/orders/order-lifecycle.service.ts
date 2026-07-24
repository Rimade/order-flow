import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import {
  InventoryRejectedEvent,
  InventoryReservedEvent,
} from '../kafka/events/inventory.events';
import {
  PaymentFailedEvent,
  PaymentSucceededEvent,
} from '../kafka/events/payment.events';
import { PrismaService } from '../prisma/prisma.service';
import { ordersStatusTransitionsTotal } from '../metrics/metrics.registry';

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [
    OrderStatus.PAYMENT_PENDING,
    OrderStatus.CANCELLED,
    OrderStatus.FAILED,
    OrderStatus.CONFIRMED,
  ],
  PAYMENT_PENDING: [
    OrderStatus.CONFIRMED,
    OrderStatus.FAILED,
    OrderStatus.CANCELLED,
  ],
  CONFIRMED: [],
  CANCELLED: [],
  FAILED: [],
};

@Injectable()
export class OrderLifecycleService {
  private readonly logger = new Logger(OrderLifecycleService.name);

  constructor(private readonly prisma: PrismaService) {}

  async handleInventoryReserved(event: InventoryReservedEvent) {
    await this.transition(
      event.eventId,
      event.eventType,
      event.data.orderId,
      OrderStatus.PAYMENT_PENDING,
    );
  }

  async handleInventoryRejected(event: InventoryRejectedEvent) {
    await this.transition(
      event.eventId,
      event.eventType,
      event.data.orderId,
      OrderStatus.CANCELLED,
    );
  }

  async handlePaymentSucceeded(event: PaymentSucceededEvent) {
    await this.transition(
      event.eventId,
      event.eventType,
      event.data.orderId,
      OrderStatus.CONFIRMED,
    );
  }

  async handlePaymentFailed(event: PaymentFailedEvent) {
    await this.transition(
      event.eventId,
      event.eventType,
      event.data.orderId,
      OrderStatus.FAILED,
    );
  }

  private async transition(
    eventId: string,
    eventType: string,
    orderId: string,
    targetStatus: OrderStatus,
  ) {
    const alreadyProcessed = await this.prisma.processedEvent.findUnique({
      where: { eventId },
    });

    if (alreadyProcessed) {
      this.logger.log(`skip duplicate event ${eventId}`);
      return;
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (order.status === targetStatus) {
      await this.markProcessed(eventId, eventType);
      return;
    }

    if (!this.canTransition(order.status, targetStatus)) {
      throw new BadRequestException(
        `Invalid transition ${order.status} -> ${targetStatus} for order ${orderId}`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: { status: targetStatus },
      }),
      this.prisma.processedEvent.create({
        data: { eventId, eventType },
      }),
    ]);

    ordersStatusTransitionsTotal.inc({
      service: 'order-service',
      status: targetStatus,
    });

    this.logger.log(
      `order ${orderId} transitioned ${order.status} -> ${targetStatus} (${eventType})`,
    );
  }

  private canTransition(from: OrderStatus, to: OrderStatus) {
    return ALLOWED_TRANSITIONS[from].includes(to);
  }

  private async markProcessed(eventId: string, eventType: string) {
    await this.prisma.processedEvent.create({
      data: { eventId, eventType },
    });
  }
}
