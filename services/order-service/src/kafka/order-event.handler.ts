import { Injectable, Logger } from '@nestjs/common';
import { OrderLifecycleService } from '../orders/order-lifecycle.service';
import {
  InventoryRejectedEvent,
  InventoryReservedEvent,
} from './events/inventory.events';
import {
  PaymentFailedEvent,
  PaymentSucceededEvent,
} from './events/payment.events';

@Injectable()
export class OrderEventHandler {
  private readonly logger = new Logger(OrderEventHandler.name);

  constructor(private readonly lifecycle: OrderLifecycleService) {}

  async handle(topic: string, payload: Buffer | null) {
    if (!payload) {
      return;
    }

    const raw = payload.toString();
    let envelope: { eventType?: string };

    try {
      envelope = JSON.parse(raw) as { eventType?: string };
    } catch {
      this.logger.error(`invalid json on topic ${topic}`);
      return;
    }

    switch (envelope.eventType) {
      case 'inventory.reserved':
        return this.lifecycle.handleInventoryReserved(
          JSON.parse(raw) as InventoryReservedEvent,
        );
      case 'inventory.rejected':
        return this.lifecycle.handleInventoryRejected(
          JSON.parse(raw) as InventoryRejectedEvent,
        );
      case 'payment.succeeded':
        return this.lifecycle.handlePaymentSucceeded(
          JSON.parse(raw) as PaymentSucceededEvent,
        );
      case 'payment.failed':
        return this.lifecycle.handlePaymentFailed(
          JSON.parse(raw) as PaymentFailedEvent,
        );
      default:
        this.logger.warn(
          `unsupported event type ${envelope.eventType ?? 'unknown'} on ${topic}`,
        );
    }
  }
}
