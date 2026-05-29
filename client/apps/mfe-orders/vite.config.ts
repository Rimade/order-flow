import federation from '@originjs/vite-plugin-federation';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';

const base = process.env.VITE_BASE_PATH ?? '/';

export default defineConfig({
	base,
	plugins: [
		react(),
		tailwindcss(),
		federation({
			name: 'mfe_orders',
			filename: 'remoteEntry.js',
			exposes: {
				'./OrdersListPage': './src/pages/OrdersListPage.tsx',
				'./OrderDetailPage': './src/pages/OrderDetailPage.tsx',
			},
			shared: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
		}),
	],
	resolve: {
		alias: {
			'@orderflow/auth': path.resolve(__dirname, '../../packages/auth/src'),
			'@orderflow/api-client': path.resolve(__dirname, '../../packages/api-client/src'),
			'@orderflow/config': path.resolve(__dirname, '../../packages/config/src'),
		},
	},
	server: {
		port: 4102,
		strictPort: true,
		cors: true,
	},
	build: {
		target: 'esnext',
		minify: false,
		cssCodeSplit: false,
	},
});
