import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

let sdk: NodeSDK | undefined;

export function initTracing(serviceName: string): void {
  if (!isOtelEnabled()) {
    return;
  }

  const endpoint =
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ??
    'http://localhost:4318/v1/traces';

  sdk = new NodeSDK({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: serviceName,
    }),
    traceExporter: new OTLPTraceExporter({ url: endpoint }),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  sdk.start();
  registerShutdown(sdk);
}

export async function shutdownTracing(): Promise<void> {
  await sdk?.shutdown();
}

function isOtelEnabled(): boolean {
  const value = (process.env.OTEL_ENABLED ?? '').toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
}

function registerShutdown(instance: NodeSDK) {
  const shutdown = () => {
    void instance.shutdown();
  };

  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}
