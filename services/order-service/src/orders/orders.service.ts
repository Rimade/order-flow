import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '../../generated/prisma/client';
import { KafkaProducerService } from '../kafka/kafka-producer.service';
import { OrderCreatedEvent } from '../kafka/order-created.event';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  async create(userId: string, dto: CreateOrderDto) {
    const currency = dto.currency ?? 'USD';
    const totalAmount = this.calculateTotal(dto.items);

    const order = await this.prisma.order.create({
      data: {
        userId,
        currency,
        totalAmount: new Prisma.Decimal(totalAmount),
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: new Prisma.Decimal(item.unitPrice),
          })),
        },
      },
      include: {
        items: true,
      },
    });

    const event: OrderCreatedEvent = {
      eventId: randomUUID(),
      eventType: 'order.created',
      occurredAt: new Date().toISOString(),
      data: {
        orderId: order.id,
        userId: order.userId,
        status: order.status,
        totalAmount: order.totalAmount.toString(),
        currency: order.currency,
        items: order.items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toString(),
        })),
      },
    };

    await this.kafkaProducer.publishOrderCreated(event);

    return this.toOrderResponse(order);
  }

  async findOne(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.toOrderResponse(order);
  }

  async findAllByUser(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => this.toOrderResponse(order));
  }

  private calculateTotal(items: CreateOrderDto['items']) {
    return items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
  }

  private toOrderResponse(
    order: {
      id: string;
      userId: string;
      status: string;
      totalAmount: Prisma.Decimal;
      currency: string;
      createdAt: Date;
      updatedAt: Date;
      items: Array<{
        id: string;
        productId: string;
        productName: string;
        quantity: number;
        unitPrice: Prisma.Decimal;
      }>;
    },
  ) {
    return {
      id: order.id,
      userId: order.userId,
      status: order.status,
      totalAmount: order.totalAmount.toString(),
      currency: order.currency,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
      })),
    };
  }
}
