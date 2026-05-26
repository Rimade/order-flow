import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, logLevel } from 'kafkajs';
import { OrderCreatedEvent } from './order-created.event';

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private kafka!: Kafka;
  private producer!: Producer;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const brokers = this.configService
      .getOrThrow<string>('KAFKA_BROKERS')
      .split(',')
      .map((broker) => broker.trim());

    this.kafka = new Kafka({
      clientId: this.configService.getOrThrow<string>('KAFKA_CLIENT_ID'),
      brokers,
      logLevel: logLevel.ERROR,
    });

    this.producer = this.kafka.producer();
    await this.producer.connect();
    this.logger.log(`Kafka producer connected to ${brokers.join(', ')}`);
  }

  async onModuleDestroy() {
    await this.producer?.disconnect();
  }

  async publishOrderCreated(event: OrderCreatedEvent) {
    const topic = this.configService.getOrThrow<string>('KAFKA_ORDER_TOPIC');

    await this.producer.send({
      topic,
      messages: [
        {
          key: event.data.orderId,
          value: JSON.stringify(event),
          headers: {
            'event-type': event.eventType,
            'event-id': event.eventId,
          },
        },
      ],
    });

    this.logger.log(
      `Published ${event.eventType} for order ${event.data.orderId}`,
    );
  }
}
