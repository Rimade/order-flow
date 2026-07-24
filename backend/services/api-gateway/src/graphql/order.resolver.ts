import {
  Args,
  Context,
  ID,
  Query,
  Resolver,
} from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { REQUEST_ID_HEADER } from '../common/constants';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { MeGql, OrderDetailsGql } from './models/order-details.model';
import { OrderBffService } from './order-bff.service';

type GqlRequest = Request & { user?: AuthenticatedUser };

@Resolver(() => OrderDetailsGql)
export class OrderResolver {
  constructor(private readonly orderBff: OrderBffService) {}

  @Query(() => OrderDetailsGql, {
    name: 'order',
    description: 'Order + items + live catalog fields (BFF aggregate)',
  })
  order(
    @Args('id', { type: () => ID }) id: string,
    @Context('req') req: GqlRequest,
  ): Promise<OrderDetailsGql> {
    const user = this.requireUser(req);
    const requestId = req.header(REQUEST_ID_HEADER) ?? undefined;
    return this.orderBff.getOrderDetails(id, user, requestId);
  }

  @Query(() => MeGql, {
    name: 'me',
    description: 'Current user + orders with catalog enrichment',
  })
  async me(@Context('req') req: GqlRequest): Promise<MeGql> {
    const user = this.requireUser(req);
    const requestId = req.header(REQUEST_ID_HEADER) ?? undefined;
    const orders = await this.orderBff.listMyOrders(user, requestId);

    return {
      id: user.userId,
      email: user.email,
      orders,
    };
  }

  private requireUser(req: GqlRequest): AuthenticatedUser {
    if (!req.user) {
      throw new UnauthorizedException();
    }
    return req.user;
  }
}
