import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OutboxAdminService } from './outbox-admin.service';

/**
 * Ops endpoints for FAILED outbox rows (order-service only).
 * Inventory/payment: use backend/scripts/outbox-replay.ps1
 */
@Controller('ops/outbox')
@UseGuards(JwtAuthGuard)
export class OutboxAdminController {
  constructor(private readonly outboxAdmin: OutboxAdminService) {}

  @Get('failed')
  listFailed(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.outboxAdmin.listFailed(limit);
  }

  @Post(':id/replay')
  replay(@Param('id', ParseUUIDPipe) id: string) {
    return this.outboxAdmin.replay(id);
  }
}
