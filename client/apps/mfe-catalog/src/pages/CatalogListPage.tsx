import { ApiError, api } from '@orderflow/api-client';
import {
  Alert,
  AlertDescription,
  Button,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@orderflow/ui';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

export default function CatalogListPage() {
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
      <div>
        <h1 className="text-2xl font-semibold">Каталог</h1>
        <p className="text-sm text-of-muted-foreground">
          Публичный read API через gateway. Выберите товар для оформления заказа.
        </p>
      </div>

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
                  <Button type="button" variant="outline" size="sm" data-testid={`view-${product.sku}`}>
                    Открыть
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
