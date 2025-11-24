export const CURRENCY = 'eur';

interface RawProductProps { 
  id: string;
  type: string;
  name: string;
  description: string;
  image: string;
  price: number;
}

export interface ProductProps extends RawProductProps {
  category: string;
  isMonthlyPizza?: boolean;
  onlyOnSite?: boolean;
}

export interface SpianataProps extends RawProductProps {
  isSpecial: boolean;
  toppings: {
    name: string,
    additionalPrice: number,
    description: string
  }
}

// Products variants for order
export interface OrderProductProps {
  id: string;
  name: string;
  price: number;
  extras: OrderProductExtraProps[];
  quantity: number;
  product_id: string;
}

// Extra variants for order product
export interface OrderProductExtraProps {
  name: string;
  price: number;
}

// Order done by customer
export interface OrderProps {
  id: string;
  user_id: string;
  price: number;
  created_at: string;
  is_delivery: boolean;
  products: OrderProductProps[];
  payment: "cash" | "card" | "online";
  status:
    | "pending"
    | "accepted"
    | "in_preparation"
    | "ready_to_pickup"
    | "not_picked_up"
    | "delivering"
    | "delivered"
    | "completed"
    | "cancelled"
    | "reopened"
    | "reported";
  customer_time?: string;
  stripe_invoice_id?: string;
  stripe_payment_intent_id?: string;
  stripe_refund_id?: string;
  is_paid?: boolean;
  is_refunded?: boolean;
  online_payment?: boolean;
  refunded_at?: string;
  refunded_by?: string;
  customer_review?: CustomerReviewProps;
  net_profit?: number;
  report?: ReportType;
  is_custom_time: boolean;
  payment_issuer: string;
  is_email_sent?: boolean;
  driver_id?: string;
}

export interface ReportType {
  category: string;
  details: string;
  created_at: string;
}

export interface UserProps {
  id: string;
  created_at: string;
  email: string;
  role: 'admin' | 'customer' | 'driver';
  address: string;
  name: string;
  phone: string;
  stripe_customer_id: string;
  reputation_score: number;
  phone_verified: boolean;
  otp: string;
  expo_push_token?: string;
  metadata: Record<string, string>;
}

export interface CustomerReviewProps {
  id: string;
  user_id: string;
  product_rating: number;
  delivery_rating: number;
  service_rating: number;
  comment: string;
  created_at: string;
}

export interface ReviewProps {
  id: string;
  user_id: string;
  customer_review: CustomerReviewProps;
  created_at: string;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  type: "pizza" | "pizzaurum" | "drink" | "other";
  customizations?: { name: string; price: number }[];
  customizationTimestamp?: number;
  uniqueId: string;
};

export interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "uniqueId">) => void;
  removeItem: (uniqueId: string) => void;
  updateQuantity: (uniqueId: string, quantity: number) => void;
  setItemQuantity: (uniqueId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
};

export interface StripeCheckoutSession {
  id: string;
  payment_intent?: string;
  amount_total: number;
  currency: string;
  customer?: string;
  customer_email?: string;
  metadata?: Record<string, string>;
  invoice?: string;
};

export interface StripePaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method_types: string[];
  customer?: string;
  metadata?: Record<string, string>;
  last_payment_error?: any;
};

export interface WebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
  created: number;
};

export interface OpenDaysProps {
  id: string;
  day: string;
  isOpen: boolean;
  timeSlots: {
    openTime: string;
    closeTime: string;
  }[]
}

export interface AnalyticsData {
  totalOrders: number;
  refundedOrders: number;
  reportedOrders: number;
  totalNetProfit: number;
  ordersByDay: { value: number; label: string; color: string }[];
  netProfitByDay: { value: number; label: string; color: string }[];
  topProducts: { value: number; id: string; label: string; color: string }[];
  ordersByStatus: { value: number; label: string; color: string }[];
}

export interface ProductAnalyticsData {
  productId: string;
  productName: string;
  totalOrders: number;
  totalQuantity: number;
  totalRevenue: number;
  averageOrderValue: number;
  lastOrderedAt?: string;
  orderFrequency: number; // orders per day in the time span
  revenueShare: number; // percentage of total revenue
  statusBreakdown: { status: string; count: number }[];
  monthlyTrend: { month: string; orders: number; revenue: number }[];
}

export type TimeSpan = 'weekly' | 'monthly';
