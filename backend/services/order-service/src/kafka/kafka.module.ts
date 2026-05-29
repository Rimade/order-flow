import { Module } from '@nestjs/common';
import { KafkaConsumerService } from './kafka-consumer.service';
import { KafkaProducerService } from './kafka-producer.service';
import { OrderEventHandler } from './order-event.handler';
import { OrderLifecycleService } from '../orders/order-lifecycle.service';

@Module({
  providers: [
    KafkaProducerService,
    KafkaConsumerService,
    OrderEventHandler,
    // Needed by OrderEventHandler, PrismaService is global (PrismaModule)
    OrderLifecycleService,
  ],
  exports: [KafkaProducerService, KafkaConsumerService],
})
export class KafkaModule {}
