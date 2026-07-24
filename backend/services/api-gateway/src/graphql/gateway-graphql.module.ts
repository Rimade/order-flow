import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ProxyModule } from '../proxy/proxy.module';
import { OrderBffService } from './order-bff.service';
import { OrderResolver } from './order.resolver';

@Module({
  imports: [
    HttpModule,
    ProxyModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      sortSchema: true,
      path: '/graphql',
      context: ({ req, res }: { req: unknown; res: unknown }) => ({ req, res }),
    }),
  ],
  providers: [OrderResolver, OrderBffService],
})
export class GatewayGraphqlModule {}
