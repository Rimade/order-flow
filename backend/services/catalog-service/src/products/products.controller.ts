import { Controller, Get, Param } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('catalog')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('products')
  findAll() {
    return this.productsService.findAll();
  }

  @Get('products/:sku')
  findBySku(@Param('sku') sku: string) {
    return this.productsService.findBySku(sku);
  }
}
