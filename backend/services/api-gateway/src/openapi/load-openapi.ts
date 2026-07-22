import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Logger } from '@nestjs/common';
import { OpenAPIObject } from '@nestjs/swagger';
import { load as loadYaml } from 'js-yaml';

const logger = new Logger('OpenApiLoader');

/**
 * Load the shared OpenAPI contract (source of truth for client codegen).
 * Path works from api-gateway cwd (services/api-gateway) and from dist/.
 */
export function loadGatewayOpenApi(): OpenAPIObject {
  const candidates = [
    join(process.cwd(), '../../packages/contracts/openapi/orderflow-gateway-v1.yaml'),
    join(process.cwd(), '../packages/contracts/openapi/orderflow-gateway-v1.yaml'),
    join(__dirname, '../../../../packages/contracts/openapi/orderflow-gateway-v1.yaml'),
  ];

  for (const filePath of candidates) {
    try {
      const raw = readFileSync(filePath, 'utf8');
      const doc = loadYaml(raw) as OpenAPIObject;
      logger.log(`OpenAPI loaded from ${filePath}`);
      return doc;
    } catch {
      // try next
    }
  }

  throw new Error(
    'Could not load orderflow-gateway-v1.yaml (expected under backend/packages/contracts/openapi)',
  );
}
