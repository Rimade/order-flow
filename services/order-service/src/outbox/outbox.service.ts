import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '../../generated/prisma/client';
import { OrderCreatedEvent } from '../kafka/order-created.event';

@Injectable()
export class OutboxService {
  constructor(private readonly configService: ConfigService) {}

  async enqueueOrderCreated(
    tx: Prisma.TransactionClient,
    event: OrderCreatedEvent,
  ) {
    const topic = this.configService.getOrThrow<string>('KAFKA_ORDER_TOPIC');

    return tx.outboxMessage.create({
      data: {
        aggregateId: event.data.orderId,
        eventType: event.eventType,
        topic,
        messageKey: event.data.orderId,
        payload: event as unknown as Prisma.InputJsonValue,
      },
    });
  }
}
