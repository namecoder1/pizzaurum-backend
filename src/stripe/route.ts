import { stripe } from "../../lib/stripe.js";
import { server } from "../../lib/fastify.js";
import dotenv from "dotenv";
import { cleanProductName } from "../../utils/sanity.js";
import { supabaseAdmin } from "../../lib/supabase.js";
import { httpError, requireField } from "../../utils/errors.js";
import { CURRENCY, type StripeCheckoutSession, type StripePaymentIntent } from "../../utils/types.js";
import { 
  handleCheckoutSessionCompleted, 
  handlePaymentIntentSucceeded, 
  handlePaymentIntentFailed, 
  handleInvoicePaymentSucceeded, 
  handleChargeFailed, 
  handleChargeUpdated, 
  handleInvoicePaymentFailed,
  formatAmountForStripe,
  getStripeFeesAndPaymentMethod
} from "../../utils/stripe.js";
import type Stripe from "stripe";
dotenv.config();

const WEBHOOK_EVENTS = {
  CHECKOUT_SESSION_COMPLETED: "checkout.session.completed",
  PAYMENT_INTENT_SUCCEEDED: "payment_intent.succeeded",
  PAYMENT_INTENT_PAYMENT_FAILED: "payment_intent.payment_failed",
  CHARGE_UPDATED: "charge.updated",
  INVOICE_PAYMENT_SUCCEEDED: "invoice.payment_succeeded",
  INVOICE_PAYMENT_FAILED: "invoice.payment_failed",
  CUSTOMER_SUBSCRIPTION_CREATED: "customer.subscription.created",
  CUSTOMER_SUBSCRIPTION_UPDATED: "customer.subscription.updated",
  CUSTOMER_SUBSCRIPTION_DELETED: "customer.subscription.deleted",
} as const;

const webhookSecret = process.env.NODE_ENV === 'production' 
  ? process.env.STRIPE_WEBHOOK_SECRET!
  : process.env.STRIPE_WEBHOOK_SECRET_TEST!;

server.post('/api/stripe/webhook', async (req, res) => {
  let event: any
  const body: any = await req.body;
  const signature = await req.headers['stripe-signature'];

  if (!signature) throw httpError(400, 'Missing Stripe signature header');

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
  } catch (parseErr: any) {
    throw httpError(400, `Webhook Error: ${parseErr.message}`);
  }

  switch (event.type) {
    case WEBHOOK_EVENTS.CHECKOUT_SESSION_COMPLETED:
      await handleCheckoutSessionCompleted(event.data.object as StripeCheckoutSession);
      break;
    
    case WEBHOOK_EVENTS.PAYMENT_INTENT_SUCCEEDED:
      await handlePaymentIntentSucceeded(event.data.object as StripePaymentIntent);
      break;
    
    case WEBHOOK_EVENTS.PAYMENT_INTENT_PAYMENT_FAILED:
      await handlePaymentIntentFailed(event.data.object as StripePaymentIntent);
      break;

    case WEBHOOK_EVENTS.CHARGE_UPDATED:
      await handleChargeUpdated(event.data.object);
      break;

    case "charge.failed":
      await handleChargeFailed(event.data.object);
      break;

    case WEBHOOK_EVENTS.INVOICE_PAYMENT_SUCCEEDED:
      await handleInvoicePaymentSucceeded(event.data.object);
      break;

    case WEBHOOK_EVENTS.INVOICE_PAYMENT_FAILED:
      await handleInvoicePaymentFailed(event.data.object);
      break;

    default:
      console.log(`⚠️  Unhandled event type: ${event.type}`, true);
  }
});

server.post('/api/stripe/create-checkout', async (req, res) => {
  try {
    const body: any = await req.body;
    const {
      items,
      totalPrice,
      user_id,
      user_email,
      is_delivery,
      customer_time,
      is_custom_time,
      stripe_customer_id
    } = body;

    requireField(items && Array.isArray(items) && items.length > 0, 'No items provided for checkout.');
    requireField(typeof totalPrice === 'number' && totalPrice > 0, 'Invalid total price.');
    requireField(user_id, 'User ID is required for checkout.');
    const products: {
      product_id: string;
      name: string;
      price: number;
      quantity: number;
      extras: any[];
    }[] = (items as any[]).map((item): {
      product_id: string;
      name: string;
      price: number;
      quantity: number;
      extras: any[];
    } => ({
      product_id: item.id,
      name: cleanProductName(item.name),
      price: item.price,
      quantity: item.quantity,
      extras: item.customizations || []
    }));
  
    const products_compact = products
      .map((p) => `${p.product_id}:${p.quantity}:${(p.extras || []).length}`)
      .join(",");
  
    const total_extras = products
      .reduce((sum, p) => sum + (p.extras?.length || 0), 0)
      .toString();
  
    const products_extras = products
      .map((p, index) => {
        const extras = p.extras || [];
        if (extras.length === 0) return null;
        return `${index}:${extras.map((e: any) => `${e.name}|${e.price}`).join(',')}`;
      })
      .filter(Boolean)
      .join(';');
  
  
    const origin = req.headers.origin;
    const host = req.headers.host;
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
  
    // Construct base URL
    let baseUrl: string;
    if (origin) {
      baseUrl = origin;
    } else if (host) {
      baseUrl = `${protocol}://${host}`;
    } else {
      // Fallback for development
      // Use APP_ENV if available, otherwise fallback to NODE_ENV
      const currentEnv = process.env.APP_ENV || process.env.NODE_ENV
      baseUrl = (currentEnv === 'production' || currentEnv === 'preview')
        ? 'https://pizzaurum.com' 
        : 'http://localhost:3000';
    }
    
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      submit_type: 'pay',
      payment_method_types: [
        'card',
        'satispay',
        'revolut_pay',
        'amazon_pay',
      ],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: CURRENCY,
            product_data: {
              name: 'Ordine Pizzaurum',
              description: `${items.length} prodotti`,
            },
            unit_amount: formatAmountForStripe(totalPrice, CURRENCY),
          }
        }
      ],
      success_url: isMobile 
        ? `${baseUrl}/orders?session_id={CHECKOUT_SESSION_ID}`
        : `${baseUrl}/orders/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: isMobile 
        ? `${baseUrl}/`
        : `${baseUrl}/checkout`,
      metadata: {
        user_id: user_id,
        is_delivery: is_delivery.toString(),
        customer_time: customer_time || new Date().toISOString(),
        is_custom_time: (is_custom_time || false).toString(),
        payment_type: "online",
        // Compact format: "id:qty:extras_count,id:qty:extras_count"
        products_compact: products_compact,
        total_extras: total_extras,
        // Extras format: "0:name|price,name|price;1:name|price"
        products_extras: products_extras
      },
      payment_method_options: {
        card: {
          request_three_d_secure: 'automatic'
        }
      }
    };
  
    if (stripe_customer_id) {
      sessionConfig.customer = stripe_customer_id
    } else if (user_email) {
      sessionConfig.customer_email = user_email
    }
  
    const session = await stripe.checkout.sessions.create(sessionConfig);
    return { sessionId: session.id, url: session.url };
  } catch (error) {
    throw httpError(500, 'Error creating checkout session', (error as any)?.message);
  }
});

server.post('/api/stripe/create-payment-sheet', async (req, res) => {
  try {
		const { 
      amount, 
      metadata, 
      cartItems, 
      user_id, 
      user_email, 
      stripe_customer_id 
    } = await req.body as any

    requireField(typeof amount === 'number' && amount > 0, 'Amount is required to create payment sheet.');
    requireField(user_id, 'User ID is required to create payment sheet.');
    requireField(cartItems && Array.isArray(cartItems), 'Cart items are required to create payment sheet.');
  
    const currentEnv = process.env.APP_ENV || process.env.NODE_ENV;
		let pubKey;
		
		if (currentEnv === 'production' || currentEnv === 'preview') {
			pubKey = process.env.EXPO_PUBLIC_STRIPE_PUBLIC_KEY;
		} else {
			pubKey = process.env.EXPO_PUBLIC_STRIPE_PUBLIC_KEY_TEST || process.env.EXPO_PUBLIC_STRIPE_PUBLIC_KEY;
		}

		let customer;
		if (stripe_customer_id) {
			try {
				customer = await stripe.customers.retrieve(stripe_customer_id);
			} catch (error) {
				customer = null;
			}
		}
	
		if (!customer) {
			const customerData: any = {};
			if (user_email) {
				customerData.email = user_email;
			}
			if (user_id) {
				customerData.metadata = { user_id };
			}
			
			customer = await stripe.customers.create(customerData);
		}

    const ephemeralKey = await stripe.ephemeralKeys.create(
			{ customer: customer.id },
			{ apiVersion: "2025-06-30.basil"}
		);

    const products = cartItems.map((item: any) => ({
      product_id: item.id,
      name: cleanProductName(item.name),
      price: item.price,
      quantity: item.quantity,
      extras: item.customizations || []
    }));

    const products_compact = products
		.map((p: any) => `${p.product_id}:${p.quantity}:${(p.extras || []).length}`)
		.join(",");

    const total_extras = products
      .reduce((sum: number, p: any) => sum + (p.extras?.length || 0), 0)
      .toString();

    const products_extras = products
      .map((p: any, index: number) => {
        const extras = p.extras || [];
        if (extras.length === 0) return null;
        return `${index}:${extras.map((e: any) => `${e.name}|${e.price}`).join(',')}`;
      })
      .filter(Boolean)
      .join(';');


    const { items, ...metadataWithoutItems } = metadata;
    const enhancedMetadata = {
      ...metadataWithoutItems,
      // Compact format: "id:qty:extras_count,id:qty:extras_count"
      products_compact: products_compact,
      total_extras: total_extras,
      // Extras format: "0:name|price,name|price;1:name|price"
      products_extras: products_extras
    };

		const paymentIntent = await stripe.paymentIntents.create({
			amount: amount,
			currency: CURRENCY,
			customer: customer.id,
			metadata: enhancedMetadata,
			payment_method_types: [
				'card',
				'satispay',
				'revolut_pay',
				'amazon_pay'
			]
		});

    if (!stripe_customer_id && user_id && customer.id) {
      try {
        const admin = supabaseAdmin;
        
        const { error: userUpdateError } = await admin
          .from("users")
          .update({ stripe_customer_id: customer.id })
          .eq("id", user_id);

        if (userUpdateError) throw httpError(500, 'Error updating user with Stripe customer ID', userUpdateError.message);
      } catch (userError) {
        throw httpError(500, 'Error updating user', (userError as any)?.message || userError);
      }
    }

    const response = {
      paymentIntent: paymentIntent.client_secret,
      ephemeralKey: ephemeralKey.secret,
      customer: customer.id,
      publishableKey: pubKey,
      stripe_customer_id: customer.id
    }

    return response;
  } catch (error) {
    throw httpError(500, 'Error creating payment sheet', (error as any)?.message);
  }
})

server.get('/api/stripe/order-id', async (req, res) => {
  try {
    const { searchParams } = await new URL(req.url);
    const sessionId = searchParams.get('session_id');

    requireField(sessionId, 'Session ID is required to retrieve order ID.');
    const session = await stripe.checkout.sessions.retrieve(sessionId as string);

    requireField(session.payment_intent, 'No payment intent found for this session.');
    const admin = supabaseAdmin;

    const { data: order, error } = await admin
      .from('orders')
      .select('id, status, price, created_at')
      .eq('stripe_payment_intent', session.payment_intent as string)
      .single();

    if (error) throw httpError(500, 'Error retrieving order', error.message);
    requireField(order, 'Order not found for this payment intent.');

    return {
      order_id: order.id,
      status: order.status,
      price: order.price,
      created_at: order.created_at
    }
  } catch (error) {
    throw httpError(500, 'Error retrieving order ID', (error as any)?.message);
  }
})

server.post('/api/stripe/payment-methods', async (req, res) => {
  try {
    const { customerId } = await req.body as any;
    requireField(customerId, 'Customer ID is required to retrieve payment methods.');

    const lastCharges = await stripe.charges.list({
      customer: customerId,
      limit: 100,
      expand: ['data.payment_method_details', 'data.billing_details', 'data.refunds'],
    });

    let chargesWithoutPaymentIntent = lastCharges.data.filter(c => !c.payment_intent);
    const grouped = lastCharges.data.reduce((acc: any, charge: any) => {
      const key = charge.payment_intent || 'legacy';
      if (!acc[key]) {
        acc[key] = {
          amount: charge.amount / 100,
          count: 1,
          currency: charge.currency,
          created: charge.created,
          status: charge.status
        };
      } else {
        acc[key].amount += charge.amount / 100;
        acc[key].count += 1;
      }
      return acc;
    }, {});

    const lastPayments = await stripe.paymentIntents.list({
      customer: customerId,
      limit: 100,
    })

    const allCharges = await stripe.charges.list({
      customer: customerId,
      limit: 100,
      expand: ['data.refunds'],
    });

    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 100,
      expand: ['data.latest_invoice'],
    });

    const updatedPayments = lastPayments.data.map((payment: any) => {
      const relatedCharges = allCharges.data.filter((charge: any) => 
        charge.payment_intent === payment.id
      );
      
      let hasRefunds = false;
      relatedCharges.forEach((charge: any) => {
        if (charge.refunded || charge.amount_refunded > 0 || 
            (charge.refunds && charge.refunds.data && charge.refunds.data.length > 0)) {
          hasRefunds = true;
        }
      });
      
      if (hasRefunds) {
        return {
          ...payment,
          status: 'refunded' as any,
          refunded: true
        };
      }
      
      return payment;
    });

    lastPayments.data = updatedPayments;

    chargesWithoutPaymentIntent = chargesWithoutPaymentIntent.map((charge: any) => {
      if (charge.refunded || (charge.refunds && charge.refunds.data && charge.refunds.data.length > 0)) {
        return {
          ...charge,
          status: 'refunded' as any
        };
      }
      return charge;
    }) as any;

    // Query Supabase per trovare gli ordini associati ai payment intents
    const paymentIntentIds = lastPayments.data.map((payment: any) => {
      // Estrai l'ID del payment intent dal client_secret
      // Il client_secret è nel formato "pi_3Rt7JvPSHwMwNxaX0N8qdpdL_secret_YlOCYgaoQKL2bajrEchGSZLXE"
      // Prendiamo solo la parte prima del secondo "_"
      const parts = payment.client_secret.split('_');
      const paymentIntentId = parts[0] + '_' + parts[1];
      return paymentIntentId;
    });

    const admin = supabaseAdmin;
    const { data: orders, error: ordersError } = await admin
      .from('orders')
      .select('id, stripe_payment_intent, status, created_at')
      .in('stripe_payment_intent', paymentIntentIds);

    if (ordersError) throw httpError(500, 'Error retrieving orders', ordersError.message);

    const orderMap = new Map();
    if (orders) {
      orders.forEach((order: any) => {
        orderMap.set(order.stripe_payment_intent, {
          id: order.id,
          status: order.status,
          created_at: order.created_at,
          link: `/orders/${order.id}`
        })
      })
    }

    const paymentsWithOrders = lastPayments.data.map((payment: any) => {
      const paymentIntentId = payment.client_secret.split('_')[0] + '_' + payment.client_secret.split('_')[1];
      const orderData = orderMap.get(paymentIntentId);
      
      return {
        ...payment,
        order: orderData || null
      };
    });

    const paymentSummary = {
      totalSpent: lastCharges.data.reduce((sum, charge) => 
        (charge.status === 'succeeded' && !charge.refunded) ? sum + charge.amount / 100 : sum, 0),
      successfulPayments: lastPayments.data.filter((p: any) => p.status === 'succeeded' && !p.refunded).length,
      refundedPayments: lastPayments.data.filter((p: any) => p.refunded || p.status === 'refunded').length,
      lastPaymentDate: (lastPayments.data.length > 0 && lastPayments.data[0]?.created !== undefined) ? 
      new Date(lastPayments.data[0].created * 1000).toISOString() : null,
      savedCards: paymentMethods.data.length,
      activeSubscriptions: subscriptions.data.filter(s => s.status === 'active').length
    };

    return {
      lastChargesWithoutPaymentIntent: chargesWithoutPaymentIntent,
      lastPayments: paymentsWithOrders,
      grouped,
      paymentMethods: paymentMethods.data,
      subscriptions: subscriptions.data,
      summary: paymentSummary
    }
  } catch (error) {
    throw httpError(500, 'Error retrieving payment methods.', (error as any)?.message);
  }
})

server.post('/api/stripe/hosted-checkout', async (req, res) => {
  try {
    const amount = req.headers['amount'];
    const amountNumber = amount ? Number(amount) : 0;
    const origin = req.headers.origin;
    requireField(amountNumber > 0, 'Amount is required to create hosted checkout session.');
    requireField(origin, 'Origin is required to build return URLs.');

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      submit_type: 'pay',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: CURRENCY,
            product_data: {
              name: 'Order'
            },
            unit_amount: formatAmountForStripe(amountNumber, CURRENCY)
          }
        }
      ],
      success_url: `${origin}/result?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
      ui_mode: 'hosted'
    })

    return { url: session.url, client_secret: session.client_secret };
  } catch (error) {
    throw httpError(500, 'Error creating hosted checkout session.', (error as any)?.message);
  }
})

server.post('/api/stripe/refund', async (req, res) => {
  try {
    const { orderId, userId, isAdmin } = await req.body as any;
    requireField(orderId, 'Order ID is required to process refund.');
    requireField(userId, 'User ID is required to process refund.');

    const admin = supabaseAdmin;
    const { data: order, error: fetchError } = await admin
      .from("orders")
      .select("id, stripe_payment_intent_id, price, status, is_refunded, user_id, payment_issuer")
      .eq("id", orderId)
      .single();

    if (fetchError || !order) throw httpError(404, 'Error fetching order', fetchError?.message || 'Order not found.');

    const { data: user, error: userError } = await admin
      .from('users')
      .select('id, reputation_score')
      .eq('id', order.user_id as any)
      .single();

    if (userError || !user) throw httpError(404, 'Error fetching user', userError?.message || 'User not found.');

    if (!isAdmin) {
      if (!userId || order.user_id !== userId) {
        throw httpError(403, 'Unauthorized to refund this order.');
      }

      // I clienti possono fare refund solo se lo status è "pending" o "accepted"
      if (order.status !== 'pending' && order.status !== 'accepted') {
        throw httpError(400, 'Order cannot be refunded at this stage.');
      }
    }

    requireField(!order.is_refunded, 'Order has already been refunded.');
    requireField(order.stripe_payment_intent_id, 'No payment intent associated with this order.');

    const refund = await stripe.refunds.create({
      payment_intent: order.stripe_payment_intent_id,
      amount: formatAmountForStripe(order.price),
      metadata: {
        order_id: orderId,
        refund_reason: isAdmin ? "requested_by_admin" : "requested_by_customer"
      }
    })

    const { error: updateError } = await admin
      .from('orders')
      .update({
        status: 'cancelled',
        is_refunded: true,
        refunded_at: new Date().toISOString(),
        refunded_by: isAdmin ? 'admin' : 'customer',
        stripe_refund_id: refund.id
      })
      .eq("id", orderId);

    if (updateError) throw httpError(500, 'Error updating order status', updateError.message);

    const { error: updateUserError } = await admin
      .from('users')
      .update({
        reputation_score: Number((user as any)?.reputation_score ?? 0) - 1
      })
      .eq("id", order.user_id as any)

    if (updateUserError) throw httpError(500, 'Error updating user reputation', updateUserError.message);
    return {
      success: true,
      refund_id: refund.id,
      amount: refund.amount / 100,
      currency: refund.currency,
      status: refund.status
    }
  } catch (error) {
    throw httpError(500, 'Error processing refund.', (error as any)?.message);
  }
})

server.post('/api/stripe/update-net-profit', async (req, res) => {
  try {
    const admin = supabaseAdmin
    const body = await req.body as any;
    const { orderId, paymentIntentId } = body;

    requireField(orderId || paymentIntentId, 'Order ID or Payment Intent ID is required to update net profit.');

    const { fee, netAmount, paymentIssuer } = await getStripeFeesAndPaymentMethod(paymentIntentId)
    const actualNetProfit = Math.round(netAmount * 100);

    const { data, error } = await admin
      .from("orders")
      .update({ 
        net_profit: actualNetProfit,
        payment_issuer: paymentIssuer
      })
      .eq("id", orderId)
      .select()
      .single();

    if (error) throw httpError(500, 'Error updating order net profit', error.message);

    return {
      success: true,
      orderId,
      paymentIntentId,
      actualFees: fee,
      netProfit: netAmount,
      netProfitCents: actualNetProfit,
      paymentIssuer: paymentIssuer
    }
  } catch (error) {
    throw httpError(500, 'Error updating net profit for order.', (error as any)?.message);
  }
})
