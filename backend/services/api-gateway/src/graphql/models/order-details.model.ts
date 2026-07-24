import {
  Field,
  ID,
  Int,
  ObjectType,
} from '@nestjs/graphql';

@ObjectType()
export class CatalogProductGql {
  @Field(() => ID)
  id!: string;

  @Field()
  sku!: string;

  @Field()
  name!: string;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field()
  price!: string;

  @Field()
  currency!: string;

  @Field(() => String, { nullable: true })
  category!: string | null;
}

@ObjectType()
export class OrderItemGql {
  @Field(() => ID)
  id!: string;

  @Field()
  productId!: string;

  @Field()
  productName!: string;

  @Field(() => Int)
  quantity!: number;

  @Field()
  unitPrice!: string;

  @Field(() => CatalogProductGql, {
    nullable: true,
    description: 'Live catalog snapshot by productId/sku; null if missing',
  })
  catalog!: CatalogProductGql | null;
}

@ObjectType()
export class OrderDetailsGql {
  @Field(() => ID)
  id!: string;

  @Field()
  userId!: string;

  @Field()
  status!: string;

  @Field()
  totalAmount!: string;

  @Field()
  currency!: string;

  @Field()
  createdAt!: string;

  @Field()
  updatedAt!: string;

  @Field(() => [OrderItemGql])
  items!: OrderItemGql[];
}
