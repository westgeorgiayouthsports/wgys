export const PaymentMethodTypeValues = {
  card: 'card',
  bank_account: 'bank_account',
} as const;
export type PaymentMethodType = typeof PaymentMethodTypeValues[keyof typeof PaymentMethodTypeValues];

export const RegistrationPaymentMethodValues = {
  stripe: 'stripe',
  paypal: 'paypal',
  square: 'square',
  check: 'check',
  cash: 'cash',
  venmo: 'venmo',
  cashapp: 'cashapp',
  other: 'other',
} as const;
export type RegistrationPaymentMethod = typeof RegistrationPaymentMethodValues[keyof typeof RegistrationPaymentMethodValues];

export const PaymentStatusValues = {
  pending: 'pending',
  paid: 'paid',
  refunded: 'refunded',
} as const;
export type PaymentStatus = typeof PaymentStatusValues[keyof typeof PaymentStatusValues];
