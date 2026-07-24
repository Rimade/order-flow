#!/usr/bin/env node
/**
 * Lightweight OpenAPI contract smoke for CI.
 * Ensures the gateway YAML parses and exposes critical paths.
 */
const fs = require('fs');
const path = require('path');

const yamlPath = path.join(
  __dirname,
  '..',
  'packages',
  'contracts',
  'openapi',
  'orderflow-gateway-v1.yaml',
);

if (!fs.existsSync(yamlPath)) {
  console.error('Missing OpenAPI file:', yamlPath);
  process.exit(1);
}

const text = fs.readFileSync(yamlPath, 'utf8');

const required = [
  'openapi:',
  '/auth/register:',
  '/auth/login:',
  '/auth/refresh:',
  '/auth/logout:',
  '/auth/me:',
  '/orders:',
  '/catalog/products:',
  'catalogCreateProduct',
  'catalogUpdateProduct',
  'analyticsSummary',
  'analyticsOrdersByDay',
  'bearerAuth:',
];

const missing = required.filter((needle) => !text.includes(needle));
if (missing.length > 0) {
  console.error('OpenAPI contract missing markers:', missing.join(', '));
  process.exit(1);
}

const lineCount = text.split(/\r?\n/).length;
if (lineCount < 50) {
  console.error('OpenAPI file looks too short:', lineCount, 'lines');
  process.exit(1);
}

console.log('OK: OpenAPI contract present with', required.length, 'required markers');
