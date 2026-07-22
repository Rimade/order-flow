const raw = import.meta.env.VITE_API_URL as string | undefined;

export const apiBaseUrl = (raw ?? 'http://localhost:3000').replace(/\/$/, '');

const catalogFlag = import.meta.env.VITE_CATALOG_ENABLED as string | undefined;
const opsFlag = import.meta.env.VITE_OPS_ENABLED as string | undefined;

export const features = {
  catalog: catalogFlag !== 'false',
  /** Outbox admin UI — default on for learning */
  ops: opsFlag !== 'false',
};
