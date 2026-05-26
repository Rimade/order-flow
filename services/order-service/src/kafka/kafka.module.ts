import { Module } from '@nestjs/common';
import { KafkaConsumerService } from './kafka-consumer.service';
import { KafkaProducerService } from './kafka-producer.service';
import { OrderEventHandler } from './order-event.handler';

@Module({
  providers: [
    KafkaProducerService,
    KafkaConsumerService,
    OrderEventHandler,
  ],
  exports: [KafkaProducerService, KafkaConsumerService],
})
export class KafkaModule {}
