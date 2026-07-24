import { ApiError, api } from '@orderflow/api-client';
import { isAuthenticated } from '@orderflow/auth';
import {
	Alert,
	AlertDescription,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	Label,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Spinner,
} from '@orderflow/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { CatalogDraftItem } from '../catalog-draft';
import { ProductFormDialog } from '../components/ProductFormDialog';

export const CATALOG_DRAFT_STORAGE_KEY = 'orderflow.catalogDraft';

const QUANTITY_OPTIONS = ['1', '2', '3', '4', '5'] as const;

export default function ProductDetailPage() {
	const { sku } = useParams<{ sku: string }>();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [quantity, setQuantity] = useState('1');
	const [checkoutOpen, setCheckoutOpen] = useState(false);
	const [editOpen, setEditOpen] = useState(false);
	const canWrite = isAuthenticated();

	const productQuery = useQuery({
		queryKey: ['catalog', 'product', sku],
		queryFn: () => api.catalog.getProduct(sku!),
		enabled: Boolean(sku),
	});

	function checkout() {
		if (!productQuery.data) return;

		const qty = Number.parseInt(quantity, 10);
		const draft: CatalogDraftItem = {
			productId: productQuery.data.sku,
			productName: productQuery.data.name,
			quantity: qty,
			unitPrice: Number(productQuery.data.price),
		};

		sessionStorage.setItem(CATALOG_DRAFT_STORAGE_KEY, JSON.stringify(draft));
		setCheckoutOpen(false);
		navigate('/orders');
	}

	if (!sku) {
		return (
			<Alert variant="danger">
				<AlertDescription>SKU не указан</AlertDescription>
			</Alert>
		);
	}

	if (productQuery.isLoading) {
		return (
			<div className="flex justify-center py-12">
				<Spinner />
			</div>
		);
	}

	if (productQuery.isError || !productQuery.data) {
		return (
			<Alert variant="danger">
				<AlertDescription>
					{productQuery.error instanceof ApiError ? productQuery.error.message : 'Товар не найден'}
				</AlertDescription>
			</Alert>
		);
	}

	const product = productQuery.data;

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<Link to="/catalog">
					<Button type="button" variant="ghost" size="sm">
						← Каталог
					</Button>
				</Link>
				{canWrite ? (
					<Button
						type="button"
						variant="outline"
						size="sm"
						data-testid="catalog-edit-open"
						onClick={() => setEditOpen(true)}>
						Редактировать
					</Button>
				) : null}
			</div>

			<Card>
				<CardHeader>
					<CardTitle>{product.name}</CardTitle>
					<p className="font-mono text-sm text-of-muted-foreground">{product.sku}</p>
				</CardHeader>
				<CardContent className="space-y-4">
					{product.description ? (
						<p className="text-sm text-of-muted-foreground">{product.description}</p>
					) : null}
					{product.category ? (
						<p className="text-sm text-of-muted-foreground">Категория: {product.category}</p>
					) : null}
					<p className="text-xl font-semibold">
						{product.price} {product.currency}
					</p>

					<Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
						<DialogTrigger asChild>
							<Button type="button" data-testid="catalog-checkout-open">
								Оформить заказ
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Оформление</DialogTitle>
								<DialogDescription>
									{product.name} — выберите количество и перейдите к созданию заказа.
								</DialogDescription>
							</DialogHeader>
							<div className="space-y-2">
								<Label htmlFor="checkout-quantity">Количество</Label>
								<Select value={quantity} onValueChange={setQuantity}>
									<SelectTrigger id="checkout-quantity" data-testid="catalog-quantity">
										<SelectValue placeholder="Количество" />
									</SelectTrigger>
									<SelectContent>
										{QUANTITY_OPTIONS.map((value) => (
											<SelectItem key={value} value={value}>
												{value}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<DialogFooter>
								<DialogClose asChild>
									<Button type="button" variant="outline">
										Отмена
									</Button>
								</DialogClose>
								<Button type="button" data-testid="catalog-checkout-confirm" onClick={checkout}>
									Перейти к заказу
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				</CardContent>
			</Card>

			<ProductFormDialog
				open={editOpen}
				onOpenChange={setEditOpen}
				mode="edit"
				product={product}
				onSuccess={(updated) => {
					void queryClient.invalidateQueries({ queryKey: ['catalog', 'products'] });
					void queryClient.invalidateQueries({
						queryKey: ['catalog', 'product', updated.sku],
					});
				}}
			/>
		</div>
	);
}
