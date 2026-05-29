import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  @IsNumber()
  @Min(1)
  PORT!: number;

  @IsIn(['development', 'production', 'test'])
  NODE_ENV!: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsNumber()
  @Min(1000)
  CACHE_TTL_MS!: number;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validated;
}
