import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import '@orderflow/ui/styles.css';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<BrowserRouter>
			<Routes>
				<Route path="/login" element={<LoginPage />} />
				<Route path="/register" element={<RegisterPage />} />
				<Route path="*" element={<LoginPage />} />
			</Routes>
		</BrowserRouter>
	</StrictMode>,
);
