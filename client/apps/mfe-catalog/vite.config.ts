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
      name: 'mfe_catalog',
      filename: 'remoteEntry.js',
      exposes: {
        './CatalogListPage': './src/pages/CatalogListPage.tsx',
        './ProductDetailPage': './src/pages/ProductDetailPage.tsx',
      },
      shared: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
    }),
  ],
  resolve: {
    alias: {
      '@orderflow/api-client': path.resolve(__dirname, '../../packages/api-client/src'),
      '@orderflow/config': path.resolve(__dirname, '../../packages/config/src'),
    },
  },
  server: {
    port: 4103,
    strictPort: true,
    cors: true,
  },
  build: {
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
  },
});
