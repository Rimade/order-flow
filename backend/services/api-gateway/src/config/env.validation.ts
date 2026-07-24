import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUrl,
  Min,
  validateSync,
  ValidateIf,
} from 'class-validator';

class EnvironmentVariables {
  @IsNumber()
  @Min(1)
  PORT!: number;

  @IsIn(['development', 'production', 'test'])
  NODE_ENV!: string;

  @IsUrl({ require_tld: false })
  AUTH_SERVICE_URL!: string;

  @IsUrl({ require_tld: false })
  ORDER_SERVICE_URL!: string;

  @IsUrl({ require_tld: false })
  CATALOG_SERVICE_URL!: string;

  @IsUrl({ require_tld: false })
  ANALYTICS_SERVICE_URL!: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_EXPIRES_IN!: string;

  @IsNumber()
  @Min(1000)
  THROTTLE_TTL_MS!: number;

  @IsNumber()
  @Min(1)
  THROTTLE_LIMIT!: number;

  @IsNumber()
  @Min(1000)
  HTTP_CLIENT_TIMEOUT_MS!: number;

  @IsIn(['redis', 'memory'])
  THROTTLE_STORAGE!: 'redis' | 'memory';

  @ValidateIf((env: EnvironmentVariables) => env.THROTTLE_STORAGE === 'redis')
  @IsString()
  @IsNotEmpty()
  REDIS_URL?: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
    forbidUnknownValues: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validated;
}
