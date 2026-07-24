import { ApiError, api } from '@orderflow/api-client';
import { isAuthenticated } from '@orderflow/auth';
import {
	Alert,
	AlertDescription,
	Button,
	PageHeader,
	Spinner,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@orderflow/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ProductFormDialog } from '../components/ProductFormDialog';

export default function CatalogListPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [createOpen, setCreateOpen] = useState(false);
	const canWrite = isAuthenticated();

	const productsQuery = useQuery({
		queryKey: ['catalog', 'products'],
		queryFn: () => api.catalog.listProducts(),
	});

	if (productsQuery.isLoading) {
		return (
			<div className="flex justify-center py-12">
				<Spinner />
			</div>
		);
	}

	if (productsQuery.isError) {
		return (
			<Alert variant="danger">
				<AlertDescription>
					{productsQuery.error instanceof ApiError
						? productsQuery.error.message
						: 'Не удалось загрузить каталог'}
				</AlertDescription>
			</Alert>
		);
	}

	const products = productsQuery.data ?? [];

	return (
		<div className="space-y-6">
			<PageHeader
				title="Каталог"
				description="Товары из catalog-service. Создайте позицию или откройте для заказа / правки."
				actions={
					canWrite ? (
						<Button
							type="button"
							size="sm"
							data-testid="catalog-create-open"
							onClick={() => setCreateOpen(true)}>
							Добавить товар
						</Button>
					) : (
						<Link to="/login">
							<Button type="button" variant="outline" size="sm">
								Войти, чтобы добавить
							</Button>
						</Link>
					)
				}
			/>

			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>SKU</TableHead>
						<TableHead>Название</TableHead>
						<TableHead>Цена</TableHead>
						<TableHead className="text-right">Действие</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{products.map((product) => (
						<TableRow key={product.id}>
							<TableCell className="font-mono text-sm">{product.sku}</TableCell>
							<TableCell>{product.name}</TableCell>
							<TableCell>
								{product.price} {product.currency}
							</TableCell>
							<TableCell className="text-right">
								<Link to={`/catalog/${product.sku}`}>
									<Button
										type="button"
										variant="outline"
										size="sm"
										data-testid={`view-${product.sku}`}>
										Открыть
									</Button>
								</Link>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>

			<ProductFormDialog
				open={createOpen}
				onOpenChange={setCreateOpen}
				mode="create"
				onSuccess={(created) => {
					void queryClient.invalidateQueries({ queryKey: ['catalog', 'products'] });
					navigate(`/catalog/${created.sku}`);
				}}
			/>
		</div>
	);
}
