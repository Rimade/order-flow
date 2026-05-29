import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { KafkaProducerService } from '../kafka/kafka-producer.service';

export type OutboxDeadLetterInput = {
  id: string;
  topic: string;
  messageKey: string;
  eventType: string;
  payload: unknown;
  retryCount: number;
  lastError: string;
};

@Injectable()
export class OutboxDlqService {
  private readonly logger = new Logger(OutboxDlqService.name);

  constructor(
    private readonly kafkaProducer: KafkaProducerService,
    private readonly configService: ConfigService,
  ) {}

  async publish(input: OutboxDeadLetterInput): Promise<void> {
    const dlqTopic = this.configService.get<string>(
      'OUTBOX_DLQ_TOPIC',
      'dlq.outbox',
    );

    const envelope = {
      eventId: randomUUID(),
      eventType: 'outbox.dead_letter',
      occurredAt: new Date().toISOString(),
      data: {
        service: this.configService.get<string>(
          'OTEL_SERVICE_NAME',
          'order-service',
        ),
        outboxId: input.id,
        originalTopic: input.topic,
        messageKey: input.messageKey,
        originalEventType: input.eventType,
        payload: input.payload,
        lastError: input.lastError,
        retryCount: input.retryCount,
      },
    };

    try {
      await this.kafkaProducer.publishRaw({
        topic: dlqTopic,
        key: input.messageKey,
        eventType: 'outbox.dead_letter',
        eventId: envelope.eventId,
        payload: envelope,
      });

      this.logger.error(
        `Outbox dead letter sent to ${dlqTopic} (outboxId=${input.id})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish outbox dead letter ${input.id}`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}
