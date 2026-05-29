import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const CACHE_LIST_KEY = 'catalog:products:all';
const cacheSkuKey = (sku: string) => `catalog:products:${sku}`;

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async findAll() {
    const cached = await this.cache.get<ReturnType<typeof this.mapProduct>[]>(
      CACHE_LIST_KEY,
    );
    if (cached) {
      return cached;
    }

    const products = await this.prisma.product.findMany({
      orderBy: { sku: 'asc' },
    });
    const mapped = products.map((p) => this.mapProduct(p));
    await this.cache.set(CACHE_LIST_KEY, mapped);
    return mapped;
  }

  async findBySku(sku: string) {
    const key = cacheSkuKey(sku);
    const cached = await this.cache.get<ReturnType<typeof this.mapProduct>>(key);
    if (cached) {
      return cached;
    }

    const product = await this.prisma.product.findUnique({
      where: { sku },
    });

    if (!product) {
      throw new NotFoundException(`Product ${sku} not found`);
    }

    const mapped = this.mapProduct(product);
    await this.cache.set(key, mapped);
    return mapped;
  }

  private mapProduct(product: {
    id: string;
    sku: string;
    name: string;
    description: string | null;
    price: Prisma.Decimal;
    currency: string;
    category: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      currency: product.currency,
      category: product.category,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };
  }
}
