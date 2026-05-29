import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, logLevel } from 'kafkajs';
import { injectKafkaHeaders } from '../telemetry/kafka-propagation';
export type KafkaPublishPayload = {
  topic: string;
  key: string;
  eventType: string;
  eventId: string;
  payload: unknown;
};

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

  async publishRaw(input: KafkaPublishPayload) {
    await this.producer.send({
      topic: input.topic,
      messages: [
        {
          key: input.key,
          value: JSON.stringify(input.payload),
          headers: injectKafkaHeaders({
            'event-type': input.eventType,
            'event-id': input.eventId,
          }),
        },
      ],
    });
  }
}
