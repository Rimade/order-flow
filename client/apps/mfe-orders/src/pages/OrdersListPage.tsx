import { ApiError, api, type CreateOrderItemInput, type OrderStatus } from '@orderflow/api-client';
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
	PageHeader,
	Spinner,
} from '@orderflow/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const CATALOG_DRAFT_STORAGE_KEY = 'orderflow.catalogDraft';

/** Happy path: inventory has stock → payment → CONFIRMED */
const DEMO_OK: CreateOrderItemInput = {
	productId: 'sku-1',
	productName: 'Demo Widget',
	quantity: 1,
	unitPrice: 10,
};

/** Failure path: sku-4 not in inventory seed → inventory.rejected → CANCELLED */
const DEMO_REJECT: CreateOrderItemInput = {
	productId: 'sku-4',
	productName: 'Reject Demo Item',
	quantity: 1,
	unitPrice: 15,
};

export default function OrdersListPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [error, setError] = useState<string | null>(null);
	const [catalogDraft, setCatalogDraft] = useState<CreateOrderItemInput | null>(null);

	useEffect(() => {
		const raw = sessionStorage.getItem(CATALOG_DRAFT_STORAGE_KEY);
		if (!raw) return;
		try {
			setCatalogDraft(JSON.parse(raw) as CreateOrderItemInput);
		} finally {
			sessionStorage.removeItem(CATALOG_DRAFT_STORAGE_KEY);
		}
	}, []);

	const ordersQuery = useQuery({
		queryKey: ['orders'],
		queryFn: () => api.graphql.meOrders(),
	});

	const createMutation = useMutation({
		mutationFn: (items: CreateOrderItemInput[]) => api.orders.create(items),
		onSuccess: (order) => {
			setError(null);
			setCatalogDraft(null);
			void queryClient.invalidateQueries({ queryKey: ['orders'] });
			navigate(`/orders/${order.id}`);
		},
		onError: (e) => {
			setError(e instanceof ApiError ? e.message : 'Не удалось создать заказ');
		},
	});

	if (ordersQuery.isLoading) {
		return (
			<div className="flex justify-center py-16">
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
	const pending = createMutation.isPending;

	return (
		<div className="space-y-6">
			<PageHeader
				title="Заказы"
				description="Список через GraphQL BFF (me.orders). Happy path: sku-1 → Подтверждён. Failure: sku-4 → Отменён."
				actions={
					<>
						<Button
							type="button"
							data-testid="create-order"
							onClick={() => createMutation.mutate([DEMO_OK])}
							disabled={pending}
						>
							{pending ? 'Создание…' : 'Заказ sku-1 (OK)'}
						</Button>
						<Button
							type="button"
							variant="outline"
							data-testid="create-order-reject"
							onClick={() => createMutation.mutate([DEMO_REJECT])}
							disabled={pending}
						>
							Заказ sku-4 (отмена)
						</Button>
					</>
				}
			/>

			{catalogDraft ? (
				<Alert variant="info">
					<AlertDescription className="flex flex-wrap items-center justify-between gap-3">
						<span>
							Из каталога: <strong>{catalogDraft.productName}</strong> ({catalogDraft.productId}) ×{' '}
							{catalogDraft.quantity}
						</span>
						<Button
							type="button"
							size="sm"
							data-testid="create-order-from-catalog"
							onClick={() => createMutation.mutate([catalogDraft])}
							disabled={pending}
						>
							Создать заказ
						</Button>
					</AlertDescription>
				</Alert>
			) : null}

			{error ? (
				<Alert variant="danger">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			) : null}

			{orders.length === 0 ? (
				<Card>
					<CardHeader>
						<CardTitle>Пока нет заказов</CardTitle>
						<CardDescription>
							Создайте заказ кнопкой выше или выберите товар в каталоге.
						</CardDescription>
					</CardHeader>
				</Card>
			) : (
				<ul className="space-y-3">
					{orders.map((order) => (
						<li key={order.id}>
							<Card className="transition-shadow hover:shadow-md">
								<CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
									<div className="min-w-0 space-y-1">
										<p className="font-mono text-xs text-of-muted-foreground">
											{order.id.slice(0, 8)}…
										</p>
										<p className="text-xl font-semibold tabular-nums">
											{order.totalAmount}{' '}
											<span className="text-sm font-normal text-of-muted-foreground">
												{order.currency}
											</span>
										</p>
										<p className="text-xs text-of-muted-foreground">
											{new Date(order.createdAt).toLocaleString('ru-RU')}
										</p>
									</div>
									<div className="flex items-center gap-3">
										<OrderStatusBadge status={order.status as OrderStatus} />
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
