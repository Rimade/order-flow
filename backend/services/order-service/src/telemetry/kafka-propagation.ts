import { context, propagation } from '@opentelemetry/api';
import { IHeaders } from 'kafkajs';

export function injectKafkaHeaders(headers: IHeaders = {}): IHeaders {
  const carrier: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) {
      continue;
    }

    carrier[key] =
      Buffer.isBuffer(value) ? value.toString('utf8') : String(value);
  }

  propagation.inject(context.active(), carrier);

  const result: IHeaders = {};
  for (const [key, value] of Object.entries(carrier)) {
    result[key] = Buffer.from(value);
  }

  return result;
}

export function extractKafkaContext(headers: IHeaders = {}) {
  const carrier: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) {
      continue;
    }

    carrier[key] =
      Buffer.isBuffer(value) ? value.toString('utf8') : String(value);
  }

  return propagation.extract(context.active(), carrier);
}
