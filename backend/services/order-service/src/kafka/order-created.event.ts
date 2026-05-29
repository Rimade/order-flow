export type OrderCreatedItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: string;
};

export type OrderCreatedEvent = {
  eventId: string;
  eventType: 'order.created';
  occurredAt: string;
  data: {
    orderId: string;
    userId: string;
    status: string;
    totalAmount: string;
    currency: string;
    items: OrderCreatedItem[];
  };
};
