import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import '@orderflow/ui/styles.css';
import OrderDetailPage from './pages/OrderDetailPage';
import OrdersListPage from './pages/OrdersListPage';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<BrowserRouter>
				<Routes>
					<Route path="/orders" element={<OrdersListPage />} />
					<Route path="/orders/:id" element={<OrderDetailPage />} />
					<Route path="*" element={<OrdersListPage />} />
				</Routes>
			</BrowserRouter>
		</QueryClientProvider>
	</StrictMode>,
);
