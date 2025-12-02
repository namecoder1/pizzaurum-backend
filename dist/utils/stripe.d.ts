import type { StripeCheckoutSession, StripePaymentIntent } from "./types.js";
export declare function formatAmountForStripe(amount: number, currency?: string): number;
export declare function getStripeFeesAndPaymentMethod(paymentIntentId: string): Promise<{
    fee: number;
    netAmount: number;
    paymentIssuer: string;
}>;
export declare function handleCheckoutSessionCompleted(session: StripeCheckoutSession): Promise<Error | undefined>;
export declare function handlePaymentIntentSucceeded(paymentIntent: StripePaymentIntent): Promise<Error | undefined>;
export declare function handlePaymentIntentFailed(paymentIntent: StripePaymentIntent): Promise<Error | undefined>;
export declare function handleInvoicePaymentSucceeded(invoice: any): Promise<Error | undefined>;
export declare function handleChargeFailed(charge: any): Promise<Error | undefined>;
export declare function handleChargeUpdated(charge: any): Promise<Error | undefined>;
export declare function handleInvoicePaymentFailed(invoice: any): Promise<void>;
//# sourceMappingURL=stripe.d.ts.map