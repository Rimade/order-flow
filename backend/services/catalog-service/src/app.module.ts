import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			validate: validateEnv,
		}),
		CacheModule.registerAsync({
			isGlobal: true,
			inject: [ConfigService],
			useFactory: async (configService: ConfigService) => {
				const ttl = configService.get<number>('CACHE_TTL_MS', 60_000);
				const store = configService.get<string>('CACHE_STORE', 'memory');

				if (store === 'redis') {
					const { createKeyv } = await import('@keyv/redis');
					const redisUrl = configService.getOrThrow<string>('REDIS_URL');
					return {
						stores: [createKeyv(redisUrl)],
						ttl,
					};
				}

				return { ttl };
			},
		}),
		PrismaModule,
		HealthModule,
		ProductsModule,
	],
})
export class AppModule {}
