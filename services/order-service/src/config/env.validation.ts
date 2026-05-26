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

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_EXPIRES_IN!: string;

  @IsString()
  @IsNotEmpty()
  KAFKA_BROKERS!: string;

  @IsString()
  @IsNotEmpty()
  KAFKA_CLIENT_ID!: string;

  @IsString()
  @IsNotEmpty()
  KAFKA_ORDER_TOPIC!: string;

  @IsString()
  @IsNotEmpty()
  KAFKA_CONSUMER_GROUP!: string;

  @IsString()
  @IsNotEmpty()
  KAFKA_INVENTORY_RESERVED_TOPIC!: string;

  @IsString()
  @IsNotEmpty()
  KAFKA_INVENTORY_REJECTED_TOPIC!: string;

  @IsString()
  @IsNotEmpty()
  KAFKA_PAYMENT_SUCCEEDED_TOPIC!: string;

  @IsString()
  @IsNotEmpty()
  KAFKA_PAYMENT_FAILED_TOPIC!: string;

  @IsNumber()
  @Min(100)
  OUTBOX_POLL_INTERVAL_MS!: number;

  @IsNumber()
  @Min(1)
  OUTBOX_BATCH_SIZE!: number;

  @IsNumber()
  @Min(1)
  OUTBOX_MAX_RETRIES!: number;

  @IsString()
  @IsNotEmpty()
  OUTBOX_DLQ_TOPIC!: string;
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
