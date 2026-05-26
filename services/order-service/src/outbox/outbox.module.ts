import { Module } from '@nestjs/common';
import { KafkaModule } from '../kafka/kafka.module';
import { OutboxDlqService } from './outbox-dlq.service';
import { OutboxRelayService } from './outbox-relay.service';
import { OutboxService } from './outbox.service';

@Module({
  imports: [KafkaModule],
  providers: [OutboxService, OutboxDlqService, OutboxRelayService],
  exports: [OutboxService],
})
export class OutboxModule {}
