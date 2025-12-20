export interface PaymentMethod {
    id: string;
    userId: string;
    type: 'card' | 'bank_account';
    brand?: string;
    last4: string;
    expMonth?: number;
    expYear?: number;
    isDefault: boolean;
    stripePaymentMethodId?: string;
    createdAt: string;
    updatedAt?: string;
}
export declare const paymentMethodsService: {
    getPaymentMethodsByUser(userId: string): Promise<PaymentMethod[]>;
    createPaymentMethod(userId: string, type: "card" | "bank_account", last4: string, brand?: string, expMonth?: number, expYear?: number, stripePaymentMethodId?: string): Promise<PaymentMethod>;
    deletePaymentMethod(id: string): Promise<void>;
    setDefaultPaymentMethod(userId: string, methodId: string): Promise<void>;
};
