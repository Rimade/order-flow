import { ApiError, api } from '@orderflow/api-client';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Spinner,
} from '@orderflow/ui';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { CatalogDraftItem } from '../catalog-draft';

export const CATALOG_DRAFT_STORAGE_KEY = 'orderflow.catalogDraft';

export default function ProductDetailPage() {
  const { sku } = useParams<{ sku: string }>();
  const navigate = useNavigate();

  const productQuery = useQuery({
    queryKey: ['catalog', 'product', sku],
    queryFn: () => api.catalog.getProduct(sku!),
    enabled: Boolean(sku),
  });

  function checkout() {
    if (!productQuery.data) return;

    const draft: CatalogDraftItem = {
      productId: productQuery.data.sku,
      productName: productQuery.data.name,
      quantity: 1,
      unitPrice: Number(productQuery.data.price),
    };

    sessionStorage.setItem(CATALOG_DRAFT_STORAGE_KEY, JSON.stringify(draft));
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
          {productQuery.error instanceof ApiError
            ? productQuery.error.message
            : 'Товар не найден'}
        </AlertDescription>
      </Alert>
    );
  }

  const product = productQuery.data;

  return (
    <div className="space-y-6">
      <Link to="/catalog">
        <Button type="button" variant="ghost" size="sm">
          ← Каталог
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>{product.name}</CardTitle>
          <p className="font-mono text-sm text-of-muted-foreground">{product.sku}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {product.description ? (
            <p className="text-sm text-of-muted-foreground">{product.description}</p>
          ) : null}
          <p className="text-xl font-semibold">
            {product.price} {product.currency}
          </p>
          <Button type="button" data-testid="catalog-checkout" onClick={checkout}>
            Оформить заказ
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
