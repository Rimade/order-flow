import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OutboxStatus } from '../../generated/prisma/client';
import { KafkaProducerService } from '../kafka/kafka-producer.service';
import { PrismaService } from '../prisma/prisma.service';
import { OutboxDlqService } from './outbox-dlq.service';

type PendingOutboxRow = {
  id: string;
  topic: string;
  message_key: string;
  event_type: string;
  payload: unknown;
  retry_count: number;
};

@Injectable()
export class OutboxRelayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxRelayService.name);
  private interval?: NodeJS.Timeout;
  private dispatching = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly kafkaProducer: KafkaProducerService,
    private readonly outboxDlq: OutboxDlqService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    const pollIntervalMs = this.configService.get<number>(
      'OUTBOX_POLL_INTERVAL_MS',
      1000,
    );

    this.interval = setInterval(() => {
      void this.dispatchPending();
    }, pollIntervalMs);

    this.logger.log(`Outbox relay started (interval ${pollIntervalMs}ms)`);
  }

  onModuleDestroy() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  async dispatchPending() {
    if (this.dispatching) {
      return;
    }

    this.dispatching = true;

    try {
      const batchSize = this.configService.get<number>('OUTBOX_BATCH_SIZE', 20);
      const maxRetries = this.configService.get<number>(
        'OUTBOX_MAX_RETRIES',
        5,
      );

      const deadLetters: Array<{
        message: PendingOutboxRow;
        lastError: string;
        retryCount: number;
      }> = [];

      await this.prisma.$transaction(async (tx) => {
        const messages = await tx.$queryRaw<PendingOutboxRow[]>`
          SELECT id, topic, message_key, event_type, payload, retry_count
          FROM outbox_messages
          WHERE status = 'PENDING'::"OutboxStatus"
            AND retry_count < ${maxRetries}
          ORDER BY created_at ASC
          LIMIT ${batchSize}
          FOR UPDATE SKIP LOCKED
        `;

        for (const message of messages) {
          try {
            await this.kafkaProducer.publishRaw({
              topic: message.topic,
              key: message.message_key,
              eventType: message.event_type,
              eventId: message.id,
              payload: message.payload,
            });

            await tx.outboxMessage.update({
              where: { id: message.id },
              data: {
                status: OutboxStatus.PUBLISHED,
                publishedAt: new Date(),
                lastError: null,
              },
            });

            this.logger.log(
              `Outbox published ${message.event_type} (${message.id})`,
            );
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            const nextRetryCount = message.retry_count + 1;
            const failed = nextRetryCount >= maxRetries;

            await tx.outboxMessage.update({
              where: { id: message.id },
              data: {
                retryCount: nextRetryCount,
                lastError: errorMessage,
                status: failed ? OutboxStatus.FAILED : OutboxStatus.PENDING,
              },
            });

            this.logger.error(
              `Outbox dispatch failed for ${message.id} (retry ${nextRetryCount}/${maxRetries})`,
              errorMessage,
            );

            if (failed) {
              deadLetters.push({
                message,
                lastError: errorMessage,
                retryCount: nextRetryCount,
              });
            }
          }
        }
      });

      for (const deadLetter of deadLetters) {
        await this.outboxDlq.publish({
          id: deadLetter.message.id,
          topic: deadLetter.message.topic,
          messageKey: deadLetter.message.message_key,
          eventType: deadLetter.message.event_type,
          payload: deadLetter.message.payload,
          retryCount: deadLetter.retryCount,
          lastError: deadLetter.lastError,
        });
      }
    } finally {
      this.dispatching = false;
    }
  }
}
