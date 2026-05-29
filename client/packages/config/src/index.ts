const raw = import.meta.env.VITE_API_URL as string | undefined;

export const apiBaseUrl = (raw ?? 'http://localhost:3000').replace(/\/$/, '');
