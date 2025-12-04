import Stripe from 'stripe';
import dotenv from "dotenv";

dotenv.config();
let sKey: string;

const appEnv = process.env.APP_ENV || process.env.NODE_ENV;
const isProdLike = appEnv === 'production' || appEnv === 'preview';

sKey = isProdLike
  ? process.env.STRIPE_SECRET_KEY!
  : process.env.STRIPE_SECRET_KEY_TEST!;

export const stripe = new Stripe(sKey, {
  apiVersion: '2025-11-17.clover'
})
