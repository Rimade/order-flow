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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export default function OutboxOpsPage() {
	const queryClient = useQueryClient();
	const [actionError, setActionError] = useState<string | null>(null);
	const [actionOk, setActionOk] = useState<string | null>(null);

	const failedQuery = useQuery({
		queryKey: ['ops', 'outbox', 'failed'],
		queryFn: () => api.ops.listFailedOutbox(50),
		refetchInterval: 10_000,
	});

	const replayMutation = useMutation({
		mutationFn: (id: string) => api.ops.replayOutbox(id),
		onSuccess: (row) => {
			setActionError(null);
			setActionOk(`Replay: ${row.id.slice(0, 8)}… → PENDING (relay подхватит)`);
			void queryClient.invalidateQueries({ queryKey: ['ops', 'outbox', 'failed'] });
		},
		onError: (e) => {
			setActionOk(null);
			setActionError(e instanceof ApiError ? e.message : 'Replay failed');
		},
	});

	if (failedQuery.isLoading) {
		return (
			<div className="flex justify-center py-16">
				<Spinner label="Загрузка outbox…" />
			</div>
		);
	}

	if (failedQuery.isError) {
		return (
			<Alert variant="danger">
				<AlertDescription>
					{failedQuery.error instanceof ApiError
						? failedQuery.error.message
						: 'Не удалось загрузить FAILED outbox'}
				</AlertDescription>
			</Alert>
		);
	}

	const rows = failedQuery.data ?? [];

	return (
		<div className="space-y-6">
			<PageHeader
				title="Outbox ops"
				description="FAILED сообщения order-service. Replay → PENDING, relay публикует снова. Inventory/payment — скрипт outbox-replay.ps1."
				actions={
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => void failedQuery.refetch()}
						disabled={failedQuery.isFetching}
					>
						Обновить
					</Button>
				}
			/>

			{actionOk ? (
				<Alert variant="success">
					<AlertDescription>{actionOk}</AlertDescription>
				</Alert>
			) : null}
			{actionError ? (
				<Alert variant="danger">
					<AlertDescription>{actionError}</AlertDescription>
				</Alert>
			) : null}

			{rows.length === 0 ? (
				<Card>
					<CardHeader>
						<CardTitle>Нет FAILED</CardTitle>
						<CardDescription>
							Outbox чист. Чтобы увидеть FAILED — сломай Kafka на время и дождись OUTBOX_MAX_RETRIES,
							либо смотри DLQ в Kafka UI (топик dlq.outbox).
						</CardDescription>
					</CardHeader>
				</Card>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Id</TableHead>
							<TableHead>Event</TableHead>
							<TableHead>Topic</TableHead>
							<TableHead>Retries</TableHead>
							<TableHead>Error</TableHead>
							<TableHead className="text-right">Действие</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.map((row) => (
							<TableRow key={row.id}>
								<TableCell className="font-mono text-xs">{row.id.slice(0, 8)}…</TableCell>
								<TableCell className="text-sm">{row.eventType}</TableCell>
								<TableCell className="font-mono text-xs">{row.topic}</TableCell>
								<TableCell>{row.retryCount}</TableCell>
								<TableCell className="max-w-[220px] truncate text-xs text-of-muted-foreground">
									{row.lastError ?? '—'}
								</TableCell>
								<TableCell className="text-right">
									<Button
										type="button"
										size="sm"
										data-testid={`replay-outbox-${row.id}`}
										disabled={replayMutation.isPending}
										onClick={() => replayMutation.mutate(row.id)}
									>
										Replay
									</Button>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}

			<Card>
				<CardContent className="space-y-2 pt-6 text-sm text-of-muted-foreground">
					<p>
						CLI (все сервисы):{' '}
						<code className="rounded bg-of-muted px-1">
							.\backend\scripts\outbox-replay.ps1 -Service order -List
						</code>
					</p>
					<p>
						Docs:{' '}
						<code className="rounded bg-of-muted px-1">backend/docs/outbox-pattern.md</code>
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
