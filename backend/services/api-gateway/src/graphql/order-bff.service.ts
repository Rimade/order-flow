import {
  BadGatewayException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import {
  REQUEST_ID_HEADER,
  USER_EMAIL_HEADER,
  USER_ID_HEADER,
} from '../common/constants';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { ProxyService } from '../proxy/proxy.service';
import {
  CatalogProductGql,
  OrderDetailsGql,
  OrderItemGql,
} from './models/order-details.model';

type UpstreamOrder = {
  id: string;
  userId: string;
  status: string;
  totalAmount: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: string;
  }>;
};

type UpstreamProduct = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  price: string;
  currency: string;
  category: string | null;
};

@Injectable()
export class OrderBffService {
  private readonly logger = new Logger(OrderBffService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly proxyService: ProxyService,
  ) {}

  async getOrderDetails(
    orderId: string,
    user: AuthenticatedUser,
    requestId?: string,
  ): Promise<OrderDetailsGql> {
    const order = await this.fetchOrder(orderId, user, requestId);
    const catalogCache = new Map<string, Promise<CatalogProductGql | null>>();
    return this.toOrderDetails(order, requestId, catalogCache);
  }

  async listMyOrders(
    user: AuthenticatedUser,
    requestId?: string,
  ): Promise<OrderDetailsGql[]> {
    const orders = await this.fetchOrders(user, requestId);
    const catalogCache = new Map<string, Promise<CatalogProductGql | null>>();
    return Promise.all(
      orders.map((order) => this.toOrderDetails(order, requestId, catalogCache)),
    );
  }

  private async toOrderDetails(
    order: UpstreamOrder,
    requestId?: string,
    catalogCache?: Map<string, Promise<CatalogProductGql | null>>,
  ): Promise<OrderDetailsGql> {
    const items = await Promise.all(
      order.items.map(async (item) =>
        this.enrichItem(item, requestId, catalogCache),
      ),
    );

    return {
      id: order.id,
      userId: order.userId,
      status: order.status,
      totalAmount: order.totalAmount,
      currency: order.currency,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items,
    };
  }

  private async enrichItem(
    item: UpstreamOrder['items'][number],
    requestId?: string,
    catalogCache?: Map<string, Promise<CatalogProductGql | null>>,
  ): Promise<OrderItemGql> {
    const catalog = await this.fetchCatalogProduct(
      item.productId,
      requestId,
      catalogCache,
    );

    return {
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      catalog,
    };
  }

  private async fetchOrders(
    user: AuthenticatedUser,
    requestId?: string,
  ): Promise<UpstreamOrder[]> {
    const base = this.proxyService.getServiceBaseUrl('order');
    const url = `${base}/api/v1/orders`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<UpstreamOrder[]>(url, {
          headers: this.buildHeaders(user, requestId),
          validateStatus: () => true,
          timeout: this.configService.get<number>('HTTP_CLIENT_TIMEOUT_MS', 10000),
        }),
      );

      if (response.status >= 400) {
        this.logger.warn(
          `order-service returned ${response.status} for ${url}`,
        );
        throw new BadGatewayException('Failed to load orders');
      }

      return response.data;
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }
      this.rethrowUpstream(error, 'order', url);
    }
  }

  private async fetchOrder(
    orderId: string,
    user: AuthenticatedUser,
    requestId?: string,
  ): Promise<UpstreamOrder> {
    const base = this.proxyService.getServiceBaseUrl('order');
    const url = `${base}/api/v1/orders/${encodeURIComponent(orderId)}`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<UpstreamOrder>(url, {
          headers: this.buildHeaders(user, requestId),
          validateStatus: () => true,
          timeout: this.configService.get<number>('HTTP_CLIENT_TIMEOUT_MS', 10000),
        }),
      );

      if (response.status === 404) {
        throw new NotFoundException('Order not found');
      }

      if (response.status >= 400) {
        this.logger.warn(
          `order-service returned ${response.status} for ${url}`,
        );
        throw new BadGatewayException('Failed to load order');
      }

      return response.data;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadGatewayException
      ) {
        throw error;
      }
      this.rethrowUpstream(error, 'order', url);
    }
  }

  private async fetchCatalogProduct(
    productIdOrSku: string,
    requestId?: string,
    catalogCache?: Map<string, Promise<CatalogProductGql | null>>,
  ): Promise<CatalogProductGql | null> {
    const cached = catalogCache?.get(productIdOrSku);
    if (cached) {
      return cached;
    }

    const pending = this.loadCatalogProduct(productIdOrSku, requestId);
    catalogCache?.set(productIdOrSku, pending);
    return pending;
  }

  private async loadCatalogProduct(
    productIdOrSku: string,
    requestId?: string,
  ): Promise<CatalogProductGql | null> {
    const base = this.proxyService.getServiceBaseUrl('catalog');
    const url = `${base}/api/v1/catalog/products/${encodeURIComponent(productIdOrSku)}`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<UpstreamProduct>(url, {
          headers: this.buildHeaders(undefined, requestId),
          validateStatus: () => true,
          timeout: this.configService.get<number>('HTTP_CLIENT_TIMEOUT_MS', 10000),
        }),
      );

      if (response.status === 404) {
        return null;
      }

      if (response.status >= 400) {
        this.logger.warn(
          `catalog-service returned ${response.status} for ${url}`,
        );
        return null;
      }

      const product = response.data;
      return {
        id: product.id,
        sku: product.sku,
        name: product.name,
        description: product.description ?? null,
        price: product.price,
        currency: product.currency,
        category: product.category ?? null,
      };
    } catch (error) {
      this.logger.warn(
        `catalog enrichment skipped for ${productIdOrSku}`,
        error instanceof Error ? error.message : error,
      );
      return null;
    }
  }

  private buildHeaders(user?: AuthenticatedUser, requestId?: string) {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (requestId) {
      headers[REQUEST_ID_HEADER] = requestId;
    }

    if (user) {
      headers[USER_ID_HEADER] = user.userId;
      headers[USER_EMAIL_HEADER] = user.email;
    }

    return headers;
  }

  private rethrowUpstream(
    error: unknown,
    service: string,
    url: string,
  ): never {
    if (error instanceof AxiosError) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new ServiceUnavailableException(
          `Upstream service "${service}" is unavailable`,
        );
      }
    }

    this.logger.error(`BFF request failed for ${url}`, error);
    throw new BadGatewayException('Failed to reach upstream service');
  }
}
