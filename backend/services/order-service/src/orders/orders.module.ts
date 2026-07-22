import { Module } from '@nestjs/common';
import { IdempotencyModule } from '../idempotency/idempotency.module';
import { OutboxModule } from '../outbox/outbox.module';
import { OrderLifecycleService } from './order-lifecycle.service';
import { OrderStatusSseService } from './order-status-sse.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [OutboxModule, IdempotencyModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderLifecycleService, OrderStatusSseService],
})
export class OrdersModule {}
