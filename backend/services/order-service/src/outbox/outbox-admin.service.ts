import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { OutboxStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OutboxAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listFailed(limit = 50) {
    const take = Math.min(Math.max(limit, 1), 100);
    const rows = await this.prisma.outboxMessage.findMany({
      where: { status: OutboxStatus.FAILED },
      orderBy: { createdAt: 'desc' },
      take,
    });

    return rows.map((row) => this.toDto(row));
  }

  async replay(id: string) {
    const existing = await this.prisma.outboxMessage.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Outbox message not found');
    }
    if (existing.status !== OutboxStatus.FAILED) {
      throw new UnprocessableEntityException(
        `Only FAILED messages can be replayed (current: ${existing.status})`,
      );
    }

    const updated = await this.prisma.outboxMessage.update({
      where: { id },
      data: {
        status: OutboxStatus.PENDING,
        retryCount: 0,
        lastError: null,
        publishedAt: null,
      },
    });

    return this.toDto(updated);
  }

  private toDto(row: {
    id: string;
    aggregateId: string;
    eventType: string;
    topic: string;
    messageKey: string;
    payload: unknown;
    status: OutboxStatus;
    retryCount: number;
    lastError: string | null;
    createdAt: Date;
    publishedAt: Date | null;
  }) {
    return {
      id: row.id,
      aggregateId: row.aggregateId,
      eventType: row.eventType,
      topic: row.topic,
      messageKey: row.messageKey,
      status: row.status,
      retryCount: row.retryCount,
      lastError: row.lastError,
      createdAt: row.createdAt.toISOString(),
      publishedAt: row.publishedAt?.toISOString() ?? null,
      service: 'order-service' as const,
    };
  }
}
