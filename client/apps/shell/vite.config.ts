import federation from '@originjs/vite-plugin-federation';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';

const mfeAuthRemote =
	process.env.VITE_MFE_AUTH_URL ?? 'http://localhost:4101/assets/remoteEntry.js';
const mfeOrdersRemote =
	process.env.VITE_MFE_ORDERS_URL ?? 'http://localhost:4102/assets/remoteEntry.js';

export default defineConfig({
	plugins: [
		react(),
		tailwindcss(),
		federation({
			name: 'shell',
			remotes: {
				mfe_auth: mfeAuthRemote,
				mfe_orders: mfeOrdersRemote,
			},
			shared: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
		}),
	],
	resolve: {
		alias: {
			'@orderflow/auth': path.resolve(__dirname, '../../packages/auth/src'),
		},
	},
	server: {
		port: 4000,
		strictPort: true,
	},
	build: {
		target: 'esnext',
		minify: false,
		cssCodeSplit: false,
	},
});
