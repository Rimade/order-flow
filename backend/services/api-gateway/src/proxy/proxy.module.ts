import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CatalogProxyController } from './catalog-proxy.controller';
import { OpsProxyController } from './ops-proxy.controller';
import { OrdersProxyController } from './orders-proxy.controller';
import { ProxyController } from './proxy.controller';
import { ProxyService } from './proxy.service';
import { ProxyStreamService } from './proxy-stream.service';

@Module({
  imports: [
    HttpModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        timeout: configService.get<number>('HTTP_CLIENT_TIMEOUT_MS', 10000),
        maxRedirects: 0,
      }),
    }),
  ],
  controllers: [
    ProxyController,
    OrdersProxyController,
    CatalogProxyController,
    OpsProxyController,
  ],
  providers: [ProxyService, ProxyStreamService],
  exports: [ProxyService],
})
export class ProxyModule {}
