import { Controller, Get, Header } from '@nestjs/common';
import { metricsRegistry } from './metrics.registry';

@Controller('metrics')
export class MetricsController {
  @Get()
  @Header('Content-Type', metricsRegistry.contentType)
  async index() {
    return metricsRegistry.metrics();
  }
}
