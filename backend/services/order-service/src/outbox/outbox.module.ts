import { Module } from '@nestjs/common';
import { KafkaModule } from '../kafka/kafka.module';
import { OutboxAdminController } from './outbox-admin.controller';
import { OutboxAdminService } from './outbox-admin.service';
import { OutboxDlqService } from './outbox-dlq.service';
import { OutboxRelayService } from './outbox-relay.service';
import { OutboxService } from './outbox.service';

@Module({
  imports: [KafkaModule],
  controllers: [OutboxAdminController],
  providers: [
    OutboxService,
    OutboxDlqService,
    OutboxRelayService,
    OutboxAdminService,
  ],
  exports: [OutboxService],
})
export class OutboxModule {}
