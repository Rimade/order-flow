import { isAuthenticated } from '@orderflow/auth';
import { Alert, AlertDescription, Spinner } from '@orderflow/ui';
import React, { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ShellLayout } from './components/ShellLayout';

const LoginPage = lazy(() => import('mfe_auth/LoginPage'));
const RegisterPage = lazy(() => import('mfe_auth/RegisterPage'));
const OrdersListPage = lazy(() => import('mfe_orders/OrdersListPage'));
const OrderDetailPage = lazy(() => import('mfe_orders/OrderDetailPage'));

function RemoteFallback() {
	return (
		<div className="flex justify-center py-12">
			<Spinner label="Загрузка модуля…" />
		</div>
	);
}

function RemoteError() {
	return (
		<Alert variant="danger">
			<AlertDescription>
				Не удалось загрузить микрофронтенд. Запустите{' '}
				<code className="rounded bg-of-muted px-1">pnpm dev</code> в папке{' '}
				<code className="rounded bg-of-muted px-1">client</code> (shell + remotes).
			</AlertDescription>
		</Alert>
	);
}

type ErrorBoundaryProps = {
	children: ReactNode;
	fallback: ReactNode;
};

type ErrorBoundaryState = { hasError: boolean };

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
	state: ErrorBoundaryState = { hasError: false };

	static getDerivedStateFromError(): ErrorBoundaryState {
		return { hasError: true };
	}

	render() {
		if (this.state.hasError) return this.props.fallback;
		return this.props.children;
	}
}

function LazyRemote({ children }: { children: ReactNode }) {
	return (
		<Suspense fallback={<RemoteFallback />}>
			<ErrorBoundary fallback={<RemoteError />}>{children}</ErrorBoundary>
		</Suspense>
	);
}

export function App() {
	return (
		<Routes>
			<Route
				path="/login"
				element={
					isAuthenticated() ? (
						<Navigate to="/orders" replace />
					) : (
						<LazyRemote>
							<LoginPage />
						</LazyRemote>
					)
				}
			/>
			<Route
				path="/register"
				element={
					isAuthenticated() ? (
						<Navigate to="/orders" replace />
					) : (
						<LazyRemote>
							<RegisterPage />
						</LazyRemote>
					)
				}
			/>
			<Route
				path="/orders"
				element={
					<ProtectedRoute>
						<ShellLayout>
							<LazyRemote>
								<OrdersListPage />
							</LazyRemote>
						</ShellLayout>
					</ProtectedRoute>
				}
			/>
			<Route
				path="/orders/:id"
				element={
					<ProtectedRoute>
						<ShellLayout>
							<LazyRemote>
								<OrderDetailPage />
							</LazyRemote>
						</ShellLayout>
					</ProtectedRoute>
				}
			/>
			<Route
				path="/"
				element={<Navigate to={isAuthenticated() ? '/orders' : '/login'} replace />}
			/>
			<Route path="*" element={<Navigate to="/" replace />} />
		</Routes>
	);
}
