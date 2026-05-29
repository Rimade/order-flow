import { Badge } from '../components/badge';

export type OrderStatus = 'PENDING' | 'PAYMENT_PENDING' | 'CONFIRMED' | 'CANCELLED' | 'FAILED';

const statusVariant: Record<
	OrderStatus,
	'default' | 'secondary' | 'success' | 'warning' | 'danger'
> = {
	PENDING: 'secondary',
	PAYMENT_PENDING: 'warning',
	CONFIRMED: 'success',
	CANCELLED: 'danger',
	FAILED: 'danger',
};

const statusLabel: Record<OrderStatus, string> = {
	PENDING: 'Ожидание',
	PAYMENT_PENDING: 'Оплата',
	CONFIRMED: 'Подтверждён',
	CANCELLED: 'Отменён',
	FAILED: 'Ошибка',
};

type OrderStatusBadgeProps = {
	status: OrderStatus;
};

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
	return (
		<Badge variant={statusVariant[status]} data-testid="order-status">
			{statusLabel[status]}
		</Badge>
	);
}
