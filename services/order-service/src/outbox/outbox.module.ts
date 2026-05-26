import { Module } from '@nestjs/common';
import { KafkaModule } from '../kafka/kafka.module';
import { OutboxRelayService } from './outbox-relay.service';
import { OutboxService } from './outbox.service';

@Module({
  imports: [KafkaModule],
  providers: [OutboxService, OutboxRelayService],
  exports: [OutboxService],
})
export class OutboxModule {}
