import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

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
    // Soft stampede guard: if another request filled/invalidated, prefer current cache
    const raced = await this.cache.get<ReturnType<typeof this.mapProduct>[]>(
      CACHE_LIST_KEY,
    );
    if (raced) {
      return raced;
    }
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
    const raced = await this.cache.get<ReturnType<typeof this.mapProduct>>(key);
    if (raced) {
      return raced;
    }
    await this.cache.set(key, mapped);
    return mapped;
  }

  async create(dto: CreateProductDto) {
    try {
      const product = await this.prisma.product.create({
        data: {
          sku: dto.sku,
          name: dto.name,
          description: dto.description,
          price: new Prisma.Decimal(dto.price),
          currency: dto.currency ?? 'USD',
          category: dto.category,
        },
      });

      await this.invalidateCache(product.sku);
      return this.mapProduct(product);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(`Product sku "${dto.sku}" already exists`);
      }
      throw error;
    }
  }

  async updateBySku(sku: string, dto: UpdateProductDto) {
    const existing = await this.prisma.product.findUnique({ where: { sku } });
    if (!existing) {
      throw new NotFoundException(`Product ${sku} not found`);
    }

    if (
      dto.name === undefined &&
      dto.description === undefined &&
      dto.price === undefined &&
      dto.currency === undefined &&
      dto.category === undefined
    ) {
      return this.mapProduct(existing);
    }

    const product = await this.prisma.product.update({
      where: { sku },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.price !== undefined
          ? { price: new Prisma.Decimal(dto.price) }
          : {}),
        ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
      },
    });

    await this.invalidateCache(sku);
    return this.mapProduct(product);
  }

  private async invalidateCache(sku: string) {
    await Promise.all([
      this.cache.del(CACHE_LIST_KEY),
      this.cache.del(cacheSkuKey(sku)),
    ]);
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
