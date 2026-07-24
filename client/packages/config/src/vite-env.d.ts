interface ImportMetaEnv {
	readonly VITE_API_URL?: string;
	readonly VITE_CATALOG_ENABLED?: string;
	readonly VITE_OPS_ENABLED?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
