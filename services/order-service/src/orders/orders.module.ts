import { Module } from '@nestjs/common';
import { KafkaModule } from '../kafka/kafka.module';
import { OrderLifecycleService } from './order-lifecycle.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [KafkaModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderLifecycleService],
})
export class OrdersModule {}
