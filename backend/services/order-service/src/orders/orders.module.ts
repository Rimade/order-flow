import { Module } from '@nestjs/common';
import { OutboxModule } from '../outbox/outbox.module';
import { OrderLifecycleService } from './order-lifecycle.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [OutboxModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderLifecycleService],
})
export class OrdersModule {}
