import { ApiError, api, type CreateOrderItemInput } from '@orderflow/api-client';
import {
	Alert,
	AlertDescription,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	OrderStatusBadge,
	Spinner,
} from '@orderflow/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const DEMO_ITEM: CreateOrderItemInput = {
	productId: 'sku-1',
	productName: 'Demo Widget',
	quantity: 1,
	unitPrice: 10,
};

export default function OrdersListPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [error, setError] = useState<string | null>(null);

	const ordersQuery = useQuery({
		queryKey: ['orders'],
		queryFn: () => api.orders.list(),
	});

	const createMutation = useMutation({
		mutationFn: () => api.orders.create([DEMO_ITEM]),
		onSuccess: (order) => {
			setError(null);
			void queryClient.invalidateQueries({ queryKey: ['orders'] });
			navigate(`/orders/${order.id}`);
		},
		onError: (e) => {
			setError(e instanceof ApiError ? e.message : 'Не удалось создать заказ');
		},
	});

	if (ordersQuery.isLoading) {
		return (
			<div className="flex justify-center py-12">
				<Spinner />
			</div>
		);
	}

	if (ordersQuery.isError) {
		return (
			<Alert variant="danger">
				<AlertDescription>
					{ordersQuery.error instanceof ApiError
						? ordersQuery.error.message
						: 'Не удалось загрузить заказы'}
				</AlertDescription>
			</Alert>
		);
	}

	const orders = ordersQuery.data ?? [];

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold">Заказы</h1>
					<p className="text-sm text-of-muted-foreground">
						Демо-товар: sku-1 (должен дойти до CONFIRMED)
					</p>
				</div>
				<Button
					type="button"
					data-testid="create-order"
					onClick={() => createMutation.mutate()}
					disabled={createMutation.isPending}>
					{createMutation.isPending ? 'Создание…' : 'Создать заказ (sku-1)'}
				</Button>
			</div>

			{error ? (
				<Alert variant="danger">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			) : null}

			{orders.length === 0 ? (
				<Card>
					<CardHeader>
						<CardTitle>Пока нет заказов</CardTitle>
						<CardDescription>Нажмите кнопку выше, чтобы создать первый заказ.</CardDescription>
					</CardHeader>
				</Card>
			) : (
				<ul className="space-y-3">
					{orders.map((order) => (
						<li key={order.id}>
							<Card>
								<CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
									<div>
										<p className="font-mono text-sm text-of-muted-foreground">
											{order.id.slice(0, 8)}…
										</p>
										<p className="text-lg font-medium">
											{order.totalAmount} {order.currency}
										</p>
									</div>
									<div className="flex items-center gap-3">
										<OrderStatusBadge status={order.status} />
										<Link to={`/orders/${order.id}`}>
											<Button variant="outline" size="sm" type="button">
												Детали
											</Button>
										</Link>
									</div>
								</CardContent>
							</Card>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
