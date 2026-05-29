export const ACCESS_TOKEN_KEY = 'orderflow.accessToken';
export const REFRESH_TOKEN_KEY = 'orderflow.refreshToken';
export const USER_KEY = 'orderflow.user';

export type AuthUser = {
	id: string;
	email: string;
};

export type AuthTokens = {
	accessToken: string;
	refreshToken: string;
	user: AuthUser;
};

export function getAccessToken(): string | null {
	return sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
	return sessionStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
	const raw = sessionStorage.getItem(USER_KEY);
	if (!raw) return null;
	try {
		return JSON.parse(raw) as AuthUser;
	} catch {
		return null;
	}
}

export function setAuthSession(tokens: AuthTokens): void {
	sessionStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
	sessionStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
	sessionStorage.setItem(USER_KEY, JSON.stringify(tokens.user));
}

export function clearAuthSession(): void {
	sessionStorage.removeItem(ACCESS_TOKEN_KEY);
	sessionStorage.removeItem(REFRESH_TOKEN_KEY);
	sessionStorage.removeItem(USER_KEY);
}

export function isAuthenticated(): boolean {
	return Boolean(getAccessToken());
}

export function getAuthHeaders(): HeadersInit {
	const token = getAccessToken();
	if (!token) return {};
	return { Authorization: `Bearer ${token}` };
}
