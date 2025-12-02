import Stripe from 'stripe';
import dotenv from "dotenv";
dotenv.config();
let sKey;
if (process.env.NODE_ENV === 'production') {
    sKey = process.env.STRIPE_SECRET_KEY;
}
else {
    sKey = process.env.STRIPE_SECRET_KEY_TEST;
}
export const stripe = new Stripe(sKey, {
    apiVersion: '2025-11-17.clover'
});
//# sourceMappingURL=stripe.js.map