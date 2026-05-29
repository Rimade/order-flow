import { Controller, Get, Header } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { metricsRegistry } from './metrics.registry';

@Public()
@Controller('metrics')
export class MetricsController {
  @Get()
  @Header('Content-Type', metricsRegistry.contentType)
  async index() {
    return metricsRegistry.metrics();
  }
}
