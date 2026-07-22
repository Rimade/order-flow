import { getAuthHeaders } from '@orderflow/auth';
import { apiBaseUrl } from '@orderflow/config';
import type { components } from './generated/schema';

export type OrderStatusEvent = {
	orderId: string;
	status: components['schemas']['OrderStatus'];
	updatedAt: string;
};

const TERMINAL: components['schemas']['OrderStatus'][] = [
	'CONFIRMED',
	'CANCELLED',
	'FAILED',
];

/**
 * Subscribe to order status via SSE (fetch stream — supports Authorization header).
 * Returns unsubscribe. On failure, calls onError so UI can fall back to polling.
 */
export function watchOrderStatus(
	orderId: string,
	handlers: {
		onEvent: (event: OrderStatusEvent) => void;
		onError?: (error: unknown) => void;
		onDone?: () => void;
	},
): () => void {
	const controller = new AbortController();
	let cancelled = false;

	void (async () => {
		try {
			const response = await fetch(
				`${apiBaseUrl}/api/v1/orders/${encodeURIComponent(orderId)}/events`,
				{
					method: 'GET',
					headers: {
						Accept: 'text/event-stream',
						...getAuthHeaders(),
					},
					signal: controller.signal,
				},
			);

			if (!response.ok || !response.body) {
				throw new Error(`SSE HTTP ${response.status}`);
			}

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let buffer = '';

			while (!cancelled) {
				const { done, value } = await reader.read();
				if (done) break;
				buffer += decoder.decode(value, { stream: true });

				const chunks = buffer.split('\n\n');
				buffer = chunks.pop() ?? '';

				for (const chunk of chunks) {
					const dataLine = chunk.split('\n').find((line) => line.startsWith('data:'));
					if (!dataLine) continue;
					const json = dataLine.slice(5).trim();
					if (!json) continue;
					const event = JSON.parse(json) as OrderStatusEvent;
					handlers.onEvent(event);
					if (TERMINAL.includes(event.status)) {
						handlers.onDone?.();
						cancelled = true;
						controller.abort();
						return;
					}
				}
			}
			handlers.onDone?.();
		} catch (error) {
			if (cancelled || (error instanceof DOMException && error.name === 'AbortError')) {
				return;
			}
			handlers.onError?.(error);
		}
	})();

	return () => {
		cancelled = true;
		controller.abort();
	};
}
