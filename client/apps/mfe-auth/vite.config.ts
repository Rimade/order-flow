import federation from '@originjs/vite-plugin-federation';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		react(),
		tailwindcss(),
		federation({
			name: 'mfe_auth',
			filename: 'remoteEntry.js',
			exposes: {
				'./LoginPage': './src/pages/LoginPage.tsx',
				'./RegisterPage': './src/pages/RegisterPage.tsx',
			},
			shared: ['react', 'react-dom', 'react-router-dom'],
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
		port: 4101,
		strictPort: true,
		cors: true,
	},
	build: {
		target: 'esnext',
		minify: false,
		cssCodeSplit: false,
	},
});
