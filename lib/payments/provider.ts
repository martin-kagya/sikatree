// Payment provider boundary. The rest of the app knows nothing about Paystack
// payloads, so a second provider can be added without touching orders.

export type PaymentInitialization = {
  reference: string;
  amountPesewas: number;
  email: string;
  callbackUrl: string;
  metadata?: Record<string, string>;
};

export type InitializedPayment = {
  reference: string;
  authorizationUrl: string;
};

export type VerifiedPayment = {
  reference: string;
  status: 'success' | 'failed' | 'pending';
  amountPesewas: number;
  currency: string;
  channel: string | null;
  feesPesewas: number;
  providerReference: string | null;
  paidAt: string | null;
};

export type PaymentWebhookEvent = {
  id: string;
  type: string;
  reference: string | null;
};

export interface PaymentProvider {
  readonly name: string;
  initialize(input: PaymentInitialization): Promise<InitializedPayment>;
  verify(reference: string): Promise<VerifiedPayment>;
  verifyWebhook(rawBody: string, signature: string | null): boolean;
  parseWebhook(rawBody: string): PaymentWebhookEvent | null;
}
