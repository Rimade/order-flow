import { ApiError, request } from './http';

export type OrderCatalogSnapshot = {
	id: string;
	sku: string;
	name: string;
	description: string | null;
	price: string;
	currency: string;
	category: string | null;
};

export type OrderItemDetails = {
	id: string;
	productId: string;
	productName: string;
	quantity: number;
	unitPrice: string;
	catalog: OrderCatalogSnapshot | null;
};

export type OrderDetails = {
	id: string;
	userId: string;
	status: string;
	totalAmount: string;
	currency: string;
	createdAt: string;
	updatedAt: string;
	items: OrderItemDetails[];
};

type GqlPayload<T> = {
	data?: T;
	errors?: Array<{ message: string }>;
};

const ORDER_FIELDS = `
  id
  userId
  status
  totalAmount
  currency
  createdAt
  updatedAt
  items {
    id
    productId
    productName
    quantity
    unitPrice
    catalog {
      id
      sku
      name
      description
      price
      currency
      category
    }
  }
`;

const ME_ORDERS_QUERY = `
  query MeOrders {
    me {
      orders {
        ${ORDER_FIELDS}
      }
    }
  }
`;

const ORDER_QUERY = `
  query OrderDetails($id: ID!) {
    order(id: $id) {
      ${ORDER_FIELDS}
    }
  }
`;

async function graphqlRequest<T>(
	query: string,
	variables?: Record<string, unknown>,
): Promise<T> {
	const payload = await request<GqlPayload<T>>('/graphql', {
		method: 'POST',
		auth: true,
		body: { query, variables },
	});

	if (payload.errors?.length) {
		throw new ApiError(
			400,
			payload.errors.map((error) => error.message).join(', '),
			payload,
		);
	}

	if (payload.data === undefined || payload.data === null) {
		throw new ApiError(502, 'Empty GraphQL response', payload);
	}

	return payload.data;
}

export async function fetchMyOrders(): Promise<OrderDetails[]> {
	const data = await graphqlRequest<{ me: { orders: OrderDetails[] } }>(ME_ORDERS_QUERY);
	return data.me.orders;
}

export async function fetchOrderDetails(id: string): Promise<OrderDetails> {
	const data = await graphqlRequest<{ order: OrderDetails | null }>(ORDER_QUERY, { id });
	if (!data.order) {
		throw new ApiError(404, 'Order not found', data);
	}
	return data.order;
}
