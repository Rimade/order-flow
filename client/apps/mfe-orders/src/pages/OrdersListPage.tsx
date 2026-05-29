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
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const CATALOG_DRAFT_STORAGE_KEY = 'orderflow.catalogDraft';

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
    queryFn: () => api.orders.list(),
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
            Демо: sku-1 (CONFIRMED) или из каталога
          </p>
        </div>
        <Button
          type="button"
          data-testid="create-order"
          onClick={() => createMutation.mutate([DEMO_ITEM])}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? 'Создание…' : 'Создать заказ (sku-1)'}
        </Button>
      </div>

      {catalogDraft ? (
        <Alert variant="info">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>
              Из каталога: {catalogDraft.productName} ({catalogDraft.productId}) ×{' '}
              {catalogDraft.quantity}
            </span>
            <Button
              type="button"
              size="sm"
              data-testid="create-order-from-catalog"
              onClick={() => createMutation.mutate([catalogDraft])}
              disabled={createMutation.isPending}
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
              Создайте заказ кнопкой выше или через каталог.
            </CardDescription>
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
