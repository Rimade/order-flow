const gatewayUrl = process.env.PLAYWRIGHT_GATEWAY_URL ?? 'http://localhost:3000';

export default async function globalSetup() {
	const healthUrl = `${gatewayUrl.replace(/\/$/, '')}/health`;

	try {
		const response = await fetch(healthUrl, { signal: AbortSignal.timeout(5_000) });
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}
	} catch (cause) {
		throw new Error(
			`Backend gateway недоступен (${healthUrl}). Подними auth, gateway, order, catalog, inventory, payment — см. backend/docs/local-dev-routine.md. ${cause}`,
		);
	}
}
