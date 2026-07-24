import { ApiError, api } from '@orderflow/api-client';
import {
	Alert,
	AlertDescription,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	PageHeader,
	Spinner,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@orderflow/ui';
import { useQuery } from '@tanstack/react-query';

function formatRate(value: number) {
	return `${(value * 100).toFixed(1)}%`;
}

export default function AnalyticsOpsPage() {
	const summaryQuery = useQuery({
		queryKey: ['analytics', 'summary'],
		queryFn: () => api.analytics.summary(),
		refetchInterval: 15_000,
	});

	const byDayQuery = useQuery({
		queryKey: ['analytics', 'orders-by-day', 7],
		queryFn: () => api.analytics.ordersByDay(7),
		refetchInterval: 15_000,
	});

	const loading = summaryQuery.isLoading || byDayQuery.isLoading;
	const error = summaryQuery.error ?? byDayQuery.error;

	if (loading) {
		return (
			<div className="flex justify-center py-16">
				<Spinner label="Загрузка analytics…" />
			</div>
		);
	}

	if (error) {
		return (
			<Alert variant="danger">
				<AlertDescription>
					{error instanceof ApiError
						? error.message
						: 'Не удалось загрузить analytics. Проверь gateway → analytics-service (:3007).'}
				</AlertDescription>
			</Alert>
		);
	}

	const summary = summaryQuery.data!;
	const byDay = byDayQuery.data!;
	const funnel = summary.funnel;

	return (
		<div className="space-y-6">
			<PageHeader
				title="Analytics"
				description="Read-model из saga-событий (Kafka → analytics-service). Не source of truth для статусов заказов."
				actions={
					<Button
						type="button"
						variant="outline"
						size="sm"
						data-testid="analytics-refresh"
						onClick={() => {
							void summaryQuery.refetch();
							void byDayQuery.refetch();
						}}
						disabled={summaryQuery.isFetching || byDayQuery.isFetching}>
						Обновить
					</Button>
				}
			/>

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader className="pb-2">
						<CardDescription>Events</CardDescription>
						<CardTitle className="text-2xl">{summary.totalEvents}</CardTitle>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardDescription>Created (PENDING)</CardDescription>
						<CardTitle className="text-2xl">{funnel.created}</CardTitle>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardDescription>Confirmed</CardDescription>
						<CardTitle className="text-2xl">{funnel.confirmed}</CardTitle>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardDescription>Cancel rate</CardDescription>
						<CardTitle className="text-2xl">{formatRate(funnel.cancelRate)}</CardTitle>
					</CardHeader>
					<CardContent className="pt-0 text-xs text-of-muted-foreground">
						CANCELLED / PENDING · failed: {funnel.failed}
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>По статусам</CardTitle>
					<CardDescription>Счётчики mapped_status из обработанных событий</CardDescription>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Status</TableHead>
								<TableHead className="text-right">Count</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{Object.entries(summary.byStatus)
								.sort(([a], [b]) => a.localeCompare(b))
								.map(([status, count]) => (
									<TableRow key={status}>
										<TableCell className="font-mono text-sm">{status}</TableCell>
										<TableCell className="text-right">{count}</TableCell>
									</TableRow>
								))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>По дням ({byDay.days}d)</CardTitle>
					<CardDescription>GET /api/v1/analytics/orders-by-day</CardDescription>
				</CardHeader>
				<CardContent>
					{byDay.items.length === 0 ? (
						<p className="text-sm text-of-muted-foreground">
							Пока пусто — сделай пару заказов (saga), чтобы появились события.
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Day</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="text-right">Count</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{byDay.items.map((row) => (
									<TableRow key={`${row.day}-${row.status}`}>
										<TableCell className="font-mono text-sm">{row.day}</TableCell>
										<TableCell className="font-mono text-sm">{row.status}</TableCell>
										<TableCell className="text-right">{row.count}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
