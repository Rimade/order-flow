import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { context, Span, trace } from '@opentelemetry/api';
import { Consumer, Kafka, logLevel } from 'kafkajs';
import {
  extractKafkaContext,
} from '../telemetry/kafka-propagation';
import { OrderEventHandler } from './order-event.handler';

@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaConsumerService.name);
  private kafka!: Kafka;
  private consumer!: Consumer;
  private running = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventHandler: OrderEventHandler,
  ) {}

  async onModuleInit() {
    const brokers = this.configService
      .getOrThrow<string>('KAFKA_BROKERS')
      .split(',')
      .map((broker) => broker.trim());

    this.kafka = new Kafka({
      clientId: `${this.configService.getOrThrow<string>('KAFKA_CLIENT_ID')}-consumer`,
      brokers,
      logLevel: logLevel.ERROR,
    });

    this.consumer = this.kafka.consumer({
      groupId: this.configService.getOrThrow<string>('KAFKA_CONSUMER_GROUP'),
    });

    await this.consumer.connect();
    await this.consumer.subscribe({
      topics: [
        this.configService.getOrThrow<string>(
          'KAFKA_INVENTORY_RESERVED_TOPIC',
        ),
        this.configService.getOrThrow<string>(
          'KAFKA_INVENTORY_REJECTED_TOPIC',
        ),
        this.configService.getOrThrow<string>('KAFKA_PAYMENT_SUCCEEDED_TOPIC'),
        this.configService.getOrThrow<string>('KAFKA_PAYMENT_FAILED_TOPIC'),
      ],
      fromBeginning: false,
    });

    this.running = true;
    void this.consumer.run({
      eachMessage: async ({ topic, message }) => {
        const parentContext = extractKafkaContext(message.headers ?? {});
        const tracer = trace.getTracer('order-service');

        await context.with(parentContext, async () =>
          tracer.startActiveSpan(`kafka.consume ${topic}`, async (span: Span) => {
            try {
              await this.eventHandler.handle(topic, message.value);
            } catch (error) {
              span.recordException(
                error instanceof Error ? error : new Error(String(error)),
              );
              this.logger.error(
                `failed to process message on ${topic}`,
                error instanceof Error ? error.stack : String(error),
              );
            } finally {
              span.end();
            }
          }),
        );
      },
    });

    this.logger.log('Kafka saga consumer started');
  }

  async onModuleDestroy() {
    this.running = false;
    await this.consumer?.disconnect();
  }
}
