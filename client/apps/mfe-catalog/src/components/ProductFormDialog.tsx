import { zodResolver } from '@hookform/resolvers/zod';
import { ApiError, api, type Product } from '@orderflow/api-client';
import {
	Alert,
	AlertDescription,
	Button,
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	Input,
	Label,
} from '@orderflow/ui';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const schema = z.object({
	sku: z
		.string()
		.min(1, 'Укажите SKU')
		.max(64)
		.regex(/^[a-zA-Z0-9_-]+$/, 'Только латиница, цифры, _ и -'),
	name: z.string().min(1, 'Укажите название').max(200),
	description: z.string().max(2000).optional(),
	price: z.coerce.number().min(0, 'Цена ≥ 0'),
	currency: z.string().min(1).max(3).default('USD'),
	category: z.string().max(64).optional(),
});

type FormValues = z.infer<typeof schema>;

type ProductFormDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	mode: 'create' | 'edit';
	product?: Product;
	onSuccess: (product: Product) => void;
};

export function ProductFormDialog({
	open,
	onOpenChange,
	mode,
	product,
	onSuccess,
}: ProductFormDialogProps) {
	const [error, setError] = useState<string | null>(null);
	const {
		register,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting },
	} = useForm<FormValues>({
		resolver: zodResolver(schema),
		defaultValues: {
			sku: '',
			name: '',
			description: '',
			price: 0,
			currency: 'USD',
			category: '',
		},
	});

	useEffect(() => {
		if (!open) return;
		setError(null);
		if (mode === 'edit' && product) {
			reset({
				sku: product.sku,
				name: product.name,
				description: product.description ?? '',
				price: Number(product.price),
				currency: product.currency || 'USD',
				category: product.category ?? '',
			});
			return;
		}
		reset({
			sku: '',
			name: '',
			description: '',
			price: 0,
			currency: 'USD',
			category: '',
		});
	}, [open, mode, product, reset]);

	async function onSubmit(values: FormValues) {
		setError(null);
		try {
			const description = values.description?.trim() || undefined;
			const category = values.category?.trim() || undefined;

			if (mode === 'create') {
				const created = await api.catalog.createProduct({
					sku: values.sku.trim(),
					name: values.name.trim(),
					description,
					price: values.price,
					currency: values.currency.trim() || 'USD',
					category,
				});
				onSuccess(created);
				onOpenChange(false);
				return;
			}

			if (!product) return;

			const updated = await api.catalog.updateProduct(product.sku, {
				name: values.name.trim(),
				description: description ?? null,
				price: values.price,
				currency: values.currency.trim() || 'USD',
				category: category ?? null,
			});
			onSuccess(updated);
			onOpenChange(false);
		} catch (e) {
			setError(
				e instanceof ApiError
					? e.message
					: mode === 'create'
						? 'Не удалось создать товар'
						: 'Не удалось сохранить товар',
			);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
					<DialogHeader>
						<DialogTitle>
							{mode === 'create' ? 'Новый товар' : 'Редактировать товар'}
						</DialogTitle>
						<DialogDescription>
							{mode === 'create'
								? 'POST /catalog/products — JWT обязателен. SKU станет productId в заказах.'
								: `PATCH /catalog/products/${product?.sku ?? ''} — JWT обязателен.`}
						</DialogDescription>
					</DialogHeader>

					{error ? (
						<Alert variant="danger">
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					) : null}

					<div className="space-y-2">
						<Label htmlFor="product-sku">SKU</Label>
						<Input
							id="product-sku"
							data-testid="product-form-sku"
							disabled={mode === 'edit'}
							{...register('sku')}
						/>
						{errors.sku ? (
							<p className="text-sm text-of-danger">{errors.sku.message}</p>
						) : null}
					</div>

					<div className="space-y-2">
						<Label htmlFor="product-name">Название</Label>
						<Input
							id="product-name"
							data-testid="product-form-name"
							{...register('name')}
						/>
						{errors.name ? (
							<p className="text-sm text-of-danger">{errors.name.message}</p>
						) : null}
					</div>

					<div className="space-y-2">
						<Label htmlFor="product-description">Описание</Label>
						<Input
							id="product-description"
							data-testid="product-form-description"
							{...register('description')}
						/>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-2">
							<Label htmlFor="product-price">Цена</Label>
							<Input
								id="product-price"
								type="number"
								step="0.01"
								min="0"
								data-testid="product-form-price"
								{...register('price')}
							/>
							{errors.price ? (
								<p className="text-sm text-of-danger">{errors.price.message}</p>
							) : null}
						</div>
						<div className="space-y-2">
							<Label htmlFor="product-currency">Валюта</Label>
							<Input
								id="product-currency"
								data-testid="product-form-currency"
								{...register('currency')}
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="product-category">Категория</Label>
						<Input
							id="product-category"
							data-testid="product-form-category"
							{...register('category')}
						/>
					</div>

					<DialogFooter>
						<DialogClose asChild>
							<Button type="button" variant="outline">
								Отмена
							</Button>
						</DialogClose>
						<Button
							type="submit"
							disabled={isSubmitting}
							data-testid="product-form-submit">
							{isSubmitting
								? 'Сохранение…'
								: mode === 'create'
									? 'Создать'
									: 'Сохранить'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
