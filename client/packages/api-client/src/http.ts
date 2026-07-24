import {
	clearAuthSession,
	getAuthHeaders,
	getRefreshToken,
	setAuthSession,
	type AuthTokens,
} from '@orderflow/auth';
import { apiBaseUrl } from '@orderflow/config';

export class ApiError extends Error {
	constructor(
		readonly statusCode: number,
		message: string,
		readonly body?: unknown,
	) {
		super(message);
		this.name = 'ApiError';
	}
}

type RequestOptions = Omit<RequestInit, 'body'> & {
	body?: unknown;
	auth?: boolean;
	/** Internal: skip refresh-on-401 (used by refresh itself) */
	skipRefresh?: boolean;
};

let refreshInFlight: Promise<boolean> | null = null;

function parseErrorMessage(data: unknown, fallback: string): string {
	if (
		typeof data === 'object' &&
		data !== null &&
		'message' in data &&
		(typeof (data as { message: unknown }).message === 'string' ||
			Array.isArray((data as { message: unknown }).message))
	) {
		return Array.isArray((data as { message: string[] }).message)
			? (data as { message: string[] }).message.join(', ')
			: String((data as { message: string }).message);
	}
	return fallback;
}

async function rawFetch(path: string, options: RequestOptions = {}): Promise<Response> {
	const { body, auth = false, headers, ...rest } = options;
	const url = `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;

	return fetch(url, {
		...rest,
		headers: {
			'Content-Type': 'application/json',
			...(auth ? getAuthHeaders() : {}),
			...headers,
		},
		body: body !== undefined ? JSON.stringify(body) : undefined,
	});
}

async function tryRefreshSession(): Promise<boolean> {
	if (refreshInFlight) {
		return refreshInFlight;
	}

	refreshInFlight = (async () => {
		const refreshToken = getRefreshToken();
		if (!refreshToken) {
			return false;
		}

		try {
			const response = await rawFetch('/api/v1/auth/refresh', {
				method: 'POST',
				body: { refreshToken },
				skipRefresh: true,
			});
			const text = await response.text();
			let data: unknown;
			if (text) {
				try {
					data = JSON.parse(text) as unknown;
				} catch {
					data = text;
				}
			}
			if (!response.ok) {
				return false;
			}
			setAuthSession(data as AuthTokens);
			return true;
		} catch {
			return false;
		} finally {
			refreshInFlight = null;
		}
	})();

	return refreshInFlight;
}

function redirectToLogin() {
	clearAuthSession();
	if (typeof window !== 'undefined') {
		window.location.assign('/login');
	}
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
	const { auth = false, skipRefresh = false, ...rest } = options;
	const response = await rawFetch(path, { ...rest, auth });

	const text = await response.text();
	let data: unknown = undefined;
	if (text) {
		try {
			data = JSON.parse(text) as unknown;
		} catch {
			data = text;
		}
	}

	if (response.status === 401 && auth && !skipRefresh) {
		const refreshed = await tryRefreshSession();
		if (refreshed) {
			return request<T>(path, { ...options, skipRefresh: true });
		}
		redirectToLogin();
	}

	if (!response.ok) {
		throw new ApiError(
			response.status,
			parseErrorMessage(data, response.statusText || 'Request failed'),
			data,
		);
	}

	return data as T;
}
