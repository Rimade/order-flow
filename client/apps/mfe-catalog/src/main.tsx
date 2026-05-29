import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import '@orderflow/ui/styles.css';
import CatalogListPage from './pages/CatalogListPage';
import ProductDetailPage from './pages/ProductDetailPage';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/catalog" element={<CatalogListPage />} />
          <Route path="/catalog/:sku" element={<ProductDetailPage />} />
          <Route path="*" element={<CatalogListPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
