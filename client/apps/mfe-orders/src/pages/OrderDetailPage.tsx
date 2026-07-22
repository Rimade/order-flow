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
	PageHeader,
	Spinner,
} from '@orderflow/ui';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';

const TERMINAL: OrderStatus[] = ['CONFIRMED', 'CANCELLED', 'FAILED'];

function StatusExplain({ status }: { status: OrderStatus }) {
	if (status === 'CONFIRMED') {
		return (
			<Alert variant="success">
				<AlertDescription>
					Happy path: inventory зарезервировал товар → payment успешен → заказ подтверждён.
				</AlertDescription>
			</Alert>
		);
	}
	if (status === 'CANCELLED') {
		return (
			<Alert variant="danger">
				<AlertDescription>
					Failure path: inventory отклонил резерв (например sku-4 нет на складе) → событие{' '}
					<code className="rounded bg-of-muted px-1">inventory.rejected</code> → статус «Отменён».
					Оплаты не было.
				</AlertDescription>
			</Alert>
		);
	}
	if (status === 'FAILED') {
		return (
			<Alert variant="danger">
				<AlertDescription>
					Оплата не прошла (<code className="rounded bg-of-muted px-1">payment.failed</code>). Заказ в
					ошибке; inventory освобождает резерв (компенсация). Локально:{' '}
					<code className="rounded bg-of-muted px-1">PAYMENT_SIMULATE_SUCCESS=false</code> в payment-service.
				</AlertDescription>
			</Alert>
		);
	}
	return null;
}

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
			<div className="flex justify-center py-16">
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
			<Link to="/orders">
				<Button variant="ghost" size="sm" type="button" className="-ml-2">
					← К списку заказов
				</Button>
			</Link>

			<PageHeader
				title="Детали заказа"
				description="Статус обновляется автоматически, пока saga не завершится."
				actions={<OrderStatusBadge status={order.status} />}
			/>

			{isPolling ? (
				<Alert variant="info">
					<AlertDescription>
						Обработка: резерв inventory → оплата → подтверждение (опрос каждые 2 с)
					</AlertDescription>
				</Alert>
			) : (
				<StatusExplain status={order.status} />
			)}

			<div className="grid gap-4 sm:grid-cols-3">
				<Card>
					<CardContent className="pt-6">
						<p className="text-xs font-medium uppercase tracking-wide text-of-muted-foreground">
							Сумма
						</p>
						<p className="mt-1 text-2xl font-semibold tabular-nums">
							{order.totalAmount}{' '}
							<span className="text-base font-normal text-of-muted-foreground">
								{order.currency}
							</span>
						</p>
					</CardContent>
				</Card>
				<Card className="sm:col-span-2">
					<CardContent className="pt-6">
						<p className="text-xs font-medium uppercase tracking-wide text-of-muted-foreground">
							Создан
						</p>
						<p className="mt-1 text-sm font-medium">
							{new Date(order.createdAt).toLocaleString('ru-RU')}
						</p>
						<p className="mt-3 break-all font-mono text-xs text-of-muted-foreground">{order.id}</p>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Позиции</CardTitle>
				</CardHeader>
				<CardContent>
					<ul className="divide-y divide-of-border">
						{order.items.map((item) => (
							<li
								key={item.id}
								className="flex flex-wrap items-center justify-between gap-2 py-4 first:pt-0 last:pb-0"
							>
								<div>
									<p className="font-medium">{item.productName}</p>
									<p className="text-sm text-of-muted-foreground">
										{item.productId} · × {item.quantity}
									</p>
								</div>
								<p className="text-sm font-semibold tabular-nums">
									{item.unitPrice} {order.currency}
								</p>
							</li>
						))}
					</ul>
				</CardContent>
			</Card>
		</div>
	);
}
