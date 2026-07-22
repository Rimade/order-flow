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

const statusPulse: Partial<Record<OrderStatus, boolean>> = {
	PENDING: true,
	PAYMENT_PENDING: true,
};

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
	const pulse = statusPulse[status];

	return (
		<Badge variant={statusVariant[status]} data-testid="order-status" className="gap-1.5">
			{pulse ? (
				<span
					className="relative flex h-2 w-2"
					aria-hidden
				>
					<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-40" />
					<span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
				</span>
			) : null}
			{statusLabel[status]}
		</Badge>
	);
}
