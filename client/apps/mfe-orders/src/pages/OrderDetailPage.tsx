import { ApiError, api, type OrderStatus } from '@orderflow/api-client';
import {
	Alert,
	AlertDescription,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	OrderStatusBadge,
	Spinner,
} from '@orderflow/ui';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';

const TERMINAL: OrderStatus[] = ['CONFIRMED', 'CANCELLED', 'FAILED'];

export default function OrderDetailPage() {
	const { id } = useParams<{ id: string }>();

	const orderQuery = useQuery({
		queryKey: ['orders', id],
		queryFn: () => api.orders.get(id!),
		enabled: Boolean(id),
		refetchInterval: (query) => {
			const status = query.state.data?.status;
			if (!status || TERMINAL.includes(status)) return false;
			return 2000;
		},
	});

	if (!id) {
		return (
			<Alert variant="danger">
				<AlertDescription>Не указан id заказа</AlertDescription>
			</Alert>
		);
	}

	if (orderQuery.isLoading) {
		return (
			<div className="flex justify-center py-12">
				<Spinner label="Загрузка заказа…" />
			</div>
		);
	}

	if (orderQuery.isError || !orderQuery.data) {
		return (
			<Alert variant="danger">
				<AlertDescription>
					{orderQuery.error instanceof ApiError ? orderQuery.error.message : 'Заказ не найден'}
				</AlertDescription>
			</Alert>
		);
	}

	const order = orderQuery.data;
	const isPolling = !TERMINAL.includes(order.status);

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Link to="/orders">
					<Button variant="ghost" size="sm" type="button">
						← Назад
					</Button>
				</Link>
				<h1 className="text-2xl font-semibold">Заказ</h1>
				<OrderStatusBadge status={order.status} />
			</div>

			{isPolling ? (
				<Alert variant="info">
					<AlertDescription>
						Статус обновляется каждые 2 с (saga: inventory → payment → CONFIRMED)
					</AlertDescription>
				</Alert>
			) : null}

			<Card>
				<CardHeader>
					<CardTitle className="font-mono text-base">{order.id}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4 text-sm">
					<p>
						<span className="text-of-muted-foreground">Сумма: </span>
						{order.totalAmount} {order.currency}
					</p>
					<p>
						<span className="text-of-muted-foreground">Создан: </span>
						{new Date(order.createdAt).toLocaleString('ru-RU')}
					</p>
					<div>
						<p className="mb-2 text-of-muted-foreground">Позиции</p>
						<ul className="space-y-2">
							{order.items.map((item) => (
								<li
									key={item.id}
									className="rounded-of-md border border-of-border bg-of-muted/50 px-3 py-2">
									{item.productName} ({item.productId}) × {item.quantity} — {item.unitPrice}{' '}
									{order.currency}
								</li>
							))}
						</ul>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
