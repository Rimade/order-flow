export type PaymentSucceededEvent = {
  eventId: string;
  eventType: 'payment.succeeded';
  occurredAt: string;
  data: {
    paymentId: string;
    orderId: string;
    amount: string;
    currency: string;
  };
};

export type PaymentFailedEvent = {
  eventId: string;
  eventType: 'payment.failed';
  occurredAt: string;
  data: {
    paymentId: string;
    orderId: string;
    reason: string;
  };
};
