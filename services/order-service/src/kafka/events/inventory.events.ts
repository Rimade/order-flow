export type InventoryReservedEvent = {
  eventId: string;
  eventType: 'inventory.reserved';
  occurredAt: string;
  data: {
    orderId: string;
    totalAmount: string;
    currency: string;
    reservations: Array<{
      productId: string;
      quantity: number;
    }>;
  };
};

export type InventoryRejectedEvent = {
  eventId: string;
  eventType: 'inventory.rejected';
  occurredAt: string;
  data: {
    orderId: string;
    reason: string;
    productId?: string;
  };
};
