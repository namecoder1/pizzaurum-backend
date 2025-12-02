import { stripe } from "../lib/stripe.js";
import { supabaseAdmin } from "../lib/supabase.js";
// Format amount for Stripe
export function formatAmountForStripe(amount, currency) {
    // Default to EUR if no currency is provided
    const safeCurrency = currency || 'EUR';
    // Stripe expects amounts in the smallest currency unit (cents for EUR, USD, etc.)
    // For zero-decimal currencies like JPY, we don't multiply by 100
    const zeroDecimalCurrencies = ['JPY', 'BIF', 'CLP', 'DJF', 'GNF', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'];
    try {
        if (zeroDecimalCurrencies.includes(safeCurrency.toUpperCase())) {
            return Math.round(amount);
        }
        // For currencies with decimals (EUR, USD, etc.), convert to cents
        return Math.round(amount * 100);
    }
    catch (error) {
        console.error('Error formatting amount for Stripe:', { amount, currency: safeCurrency, error });
        // Fallback to EUR conversion
        return Math.round(amount * 100);
    }
}
export async function getStripeFeesAndPaymentMethod(paymentIntentId) {
    var _a, _b;
    try {
        const charges = await stripe.charges.list({
            payment_intent: paymentIntentId,
        });
        const charge = charges.data[0];
        if (charge && charge.balance_transaction) {
            const balanceTransaction = await stripe.balanceTransactions.retrieve(typeof charge.balance_transaction === 'string'
                ? charge.balance_transaction
                : charge.balance_transaction.id);
            const netAmount = balanceTransaction.net / 100;
            const fee = balanceTransaction.fee / 100;
            const grossAmount = balanceTransaction.amount / 100;
            // Get payment issuer - prima prova con i dettagli del charge
            let paymentIssuer = 'Unknown';
            if (charge.payment_method_details) {
                if (charge.payment_method_details.type === 'card' && charge.payment_method_details.card) {
                    paymentIssuer = ((_a = charge.payment_method_details.card.wallet) === null || _a === void 0 ? void 0 : _a.type) ||
                        charge.payment_method_details.card.brand ||
                        'Unknown';
                }
                else if (charge.payment_method_details.type === 'satispay') {
                    paymentIssuer = 'Satispay';
                }
                else {
                    // Per altri tipi di payment method, usa il tipo stesso
                    paymentIssuer = charge.payment_method_details.type.charAt(0).toUpperCase() + charge.payment_method_details.type.slice(1);
                }
            }
            // Se non abbiamo trovato il payment issuer dai dettagli del charge, prova con il PaymentIntent
            if (paymentIssuer === 'Unknown') {
                try {
                    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
                        expand: ['payment_method']
                    });
                    if (paymentIntent.payment_method && typeof paymentIntent.payment_method === 'object') {
                        const paymentMethod = paymentIntent.payment_method;
                        if (paymentMethod.type === 'card' && paymentMethod.card) {
                            paymentIssuer = ((_b = paymentMethod.card.wallet) === null || _b === void 0 ? void 0 : _b.type) ||
                                paymentMethod.card.brand ||
                                'Unknown';
                        }
                        else if (paymentMethod.type === 'satispay') {
                            paymentIssuer = 'Satispay';
                        }
                        else {
                            // Per altri tipi di payment method, usa il tipo stesso
                            paymentIssuer = paymentMethod.type.charAt(0).toUpperCase() + paymentMethod.type.slice(1);
                        }
                    }
                }
                catch (error) {
                    console.log(`Error retrieving PaymentIntent for payment issuer: ${error}`, true);
                }
            }
            return { fee: fee, netAmount: netAmount, paymentIssuer: paymentIssuer };
        }
        else {
            console.log(`No balance transaction found for payment intent: ${paymentIntentId}`, true);
            // Fallback: calculate estimated fees
            const amount = charge ? charge.amount / 100 : 0;
            const estimatedFee = (amount * 0.029) + 0.30;
            const netAmount = amount - estimatedFee;
            return { fee: estimatedFee, netAmount: Math.max(0, netAmount), paymentIssuer: 'Unknown' };
        }
    }
    catch (error) {
        console.log(`Error retrieving charge details for net profit: ${error}`, true);
        // Fallback to estimated fees
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        const amount = paymentIntent.amount / 100;
        const estimatedFee = (amount * 0.029) + 0.30;
        const netAmount = amount - estimatedFee;
        return { fee: estimatedFee, netAmount: Math.max(0, netAmount), paymentIssuer: 'Unknown' };
    }
}
export async function handleCheckoutSessionCompleted(session) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    try {
        const admin = await supabaseAdmin;
        const { data: existingOrder, error: existingError } = await admin
            .from('orders')
            .select('*')
            .eq('stripe_session_id', session.id)
            .single();
        if (existingError && existingError.code !== 'PGRST116')
            return new Error(`Error checking existing order: ${existingError.message}`);
        if (existingOrder)
            return new Error('Order already exists');
        if (!((_a = session.metadata) === null || _a === void 0 ? void 0 : _a.user_id))
            return new Error('No user_id in session metadata');
        const { data: userData, error: userError } = await admin
            .from('users')
            .select('id, name, email')
            .eq('id', (_b = session === null || session === void 0 ? void 0 : session.metadata) === null || _b === void 0 ? void 0 : _b.user_id)
            .single();
        if (userError)
            return new Error(`User not found: ${userError.message}`);
        const totalAmount = session.amount_total / 100;
        const estimatedFee = (totalAmount * 0.029) + 0.3;
        const estimatedNetProfit = Math.round(Math.max(0, totalAmount - estimatedFee) * 100);
        let products = [];
        if ((_c = session === null || session === void 0 ? void 0 : session.metadata) === null || _c === void 0 ? void 0 : _c.products_compact) {
            const productEntries = session.metadata.products_compact.split(',');
            const extrasMap = new Map();
            if (session.metadata.products_extras) {
                const extrasEntries = session.metadata.products_extras.split(';');
                extrasEntries.forEach((entry) => {
                    const [indexStr, extrasStr] = entry.split(':');
                    const index = parseInt(indexStr);
                    const extras = extrasStr === null || extrasStr === void 0 ? void 0 : extrasStr.split(',').map((extra) => {
                        const [name, price] = extra.split('|');
                        return { name, price: parseFloat(price) };
                    });
                    extrasMap.set(index, extras);
                });
            }
            products = productEntries.map((entry, index) => {
                const [productId, quantity, extrasCount] = entry.split('|');
                const extras = extrasMap.get(index) || [];
                return {
                    name: `Prodotto ${productId}`,
                    price: 0,
                    quantity: parseInt(quantity),
                    extras: extras,
                    product_id: productId,
                };
            });
        }
        else {
            products = [{
                    name: 'Ordine Pizzaurum',
                    price: session.amount_total / 100,
                    quantity: 1,
                    product_id: null,
                    extras: []
                }];
        }
        const totalPrice = session.amount_total / 100;
        const orderData = {
            status: 'pending',
            price: totalPrice,
            payment: 'online',
            is_paid: true,
            online_payment: true,
            stripe_invoice_id: session.invoice,
            stripe_payment_intent_id: session.payment_intent,
            customer_time: (_d = session === null || session === void 0 ? void 0 : session.metadata) === null || _d === void 0 ? void 0 : _d.customer_time,
            user_id: (_e = session === null || session === void 0 ? void 0 : session.metadata) === null || _e === void 0 ? void 0 : _e.user_id,
            products: products,
            is_delivery: ((_f = session === null || session === void 0 ? void 0 : session.metadata) === null || _f === void 0 ? void 0 : _f.is_delivery) === 'true' || false,
            is_custom_time: ((_g = session === null || session === void 0 ? void 0 : session.metadata) === null || _g === void 0 ? void 0 : _g.is_custom_time) === 'true' || false,
            net_profit: estimatedNetProfit,
            payment_issuer: 'Unknown',
            is_refunded: null,
            customer_review: null,
            report: null,
            stripe_refund_id: null,
            refunded_at: null,
            refunded_by: null,
            is_email_sent: false,
        };
        const { data: insertedOrder, error: insertError } = await admin
            .from('orders')
            .insert(orderData)
            .select('id')
            .single();
        if (insertError)
            return new Error(`Error inserting order: ${insertError.message}`);
        try {
            const { data: userProfile, error: infoUserError } = await admin
                .from('users')
                .select('id, reputation_score')
                .eq('id', (_h = session === null || session === void 0 ? void 0 : session.metadata) === null || _h === void 0 ? void 0 : _h.user_id)
                .single();
            if (!infoUserError) {
                await admin
                    .from('users')
                    .update({ reputation_score: (userProfile.reputation_score || 0) + 1 })
                    .eq('id', (_j = session === null || session === void 0 ? void 0 : session.metadata) === null || _j === void 0 ? void 0 : _j.user_id);
            }
        }
        catch (error) {
            return new Error('Error updating user reputation score');
        }
        if (insertedOrder.id)
            console.log('Order created successfully');
    }
    catch (error) {
        return new Error('Error processing checkout session completed');
    }
}
export async function handlePaymentIntentSucceeded(paymentIntent) {
    var _a, _b, _c, _d, _e, _f;
    try {
        const admin = await supabaseAdmin;
        const { data: existingOrder } = await admin
            .from('orders')
            .select('*')
            .eq('stripe_payment_intent_id', paymentIntent.id)
            .single();
        if (existingOrder)
            return new Error('Order already exists');
        if (!((_a = paymentIntent.metadata) === null || _a === void 0 ? void 0 : _a.user_id))
            return new Error('No user_id in payment intent metadata');
        // Create basic products array
        let products = [];
        try {
            if ((_b = paymentIntent.metadata) === null || _b === void 0 ? void 0 : _b.cart_items) {
                const cartItems = JSON.parse(paymentIntent.metadata.cart_items);
                products = cartItems.map((item) => ({
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    product_id: item.id,
                    extras: item.customizations || []
                }));
            }
            else if ((_c = paymentIntent.metadata) === null || _c === void 0 ? void 0 : _c.products_compact) {
                const productEntries = paymentIntent.metadata.products_compact.split(",");
                products = productEntries.map((entry, index) => {
                    const [productId, quantity, extrasCount] = entry.split(":");
                    return {
                        name: `Prodotto ${productId}`,
                        price: 0,
                        quantity: parseInt(quantity),
                        product_id: productId,
                        extras: []
                    };
                });
            }
            else {
                products = [{
                        name: `Ordine Pizzaurum`,
                        price: paymentIntent.amount / 100,
                        quantity: 1,
                        product_id: null,
                        extras: []
                    }];
            }
        }
        catch (error) {
            products = [{
                    name: `Ordine Pizzaurum`,
                    price: paymentIntent.amount / 100,
                    quantity: 1,
                    product_id: null,
                    extras: []
                }];
        }
        const totalAmount = paymentIntent.amount / 100;
        const estimatedFee = (totalAmount * 0.029) + 0.3;
        const estimatedNetProfit = Math.max(0, totalAmount - estimatedFee) * 100;
        const totalPrice = paymentIntent.amount / 100;
        const orderData = {
            status: "pending",
            stripe_payment_intent_id: paymentIntent.id,
            payment: "online",
            is_paid: true,
            online_payment: true,
            price: totalPrice,
            customer_time: ((_d = paymentIntent.metadata) === null || _d === void 0 ? void 0 : _d.customer_time) || 'asap',
            user_id: paymentIntent.metadata.user_id,
            products: products,
            is_delivery: ((_e = paymentIntent.metadata) === null || _e === void 0 ? void 0 : _e.is_delivery) === "true" || false,
            is_custom_time: ((_f = paymentIntent.metadata) === null || _f === void 0 ? void 0 : _f.is_custom_time) === "true" || false,
            net_profit: Math.round(estimatedNetProfit * 100),
            payment_issuer: 'Unknown',
            is_refunded: null,
            customer_review: null,
            report: null,
            stripe_refund_id: null,
            refunded_at: null,
            refunded_by: null,
            is_email_sent: false
        };
        const { data: insertedOrder, error: insertError } = await admin
            .from("orders")
            .insert(orderData)
            .select("id")
            .single();
        if (insertError)
            return new Error(`Error inserting order: ${insertError.message}`);
        console.log(`Order processed successfully for payment intent: ${paymentIntent.id}`);
    }
    catch (error) {
        return new Error('Error processing payment intent succeeded');
    }
}
export async function handlePaymentIntentFailed(paymentIntent) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    try {
        const admin = await supabaseAdmin;
        // Create basic products array
        let products = [];
        try {
            if ((_a = paymentIntent.metadata) === null || _a === void 0 ? void 0 : _a.cart_items) {
                const cartItems = JSON.parse(paymentIntent.metadata.cart_items);
                products = cartItems.map((item) => ({
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    product_id: item.id,
                    extras: item.customizations || []
                }));
            }
            else if ((_b = paymentIntent.metadata) === null || _b === void 0 ? void 0 : _b.products_compact) {
                const productEntries = paymentIntent.metadata.products_compact.split(",");
                products = productEntries.map((entry, index) => {
                    const [productId, quantity, extrasCount] = entry.split(":");
                    return {
                        name: `Prodotto ${productId}`,
                        price: 0,
                        quantity: parseInt(quantity),
                        product_id: productId,
                        extras: []
                    };
                });
            }
            else {
                const itemsCount = parseInt(((_c = paymentIntent.metadata) === null || _c === void 0 ? void 0 : _c.items_count) || "1");
                products = [{
                        name: `Ordine Pizzaurum (${itemsCount} prodotti) - Pagamento Fallito`,
                        price: paymentIntent.amount / 100,
                        quantity: 1,
                        product_id: null,
                        extras: []
                    }];
            }
        }
        catch (error) {
            const itemsCount = parseInt(((_d = paymentIntent.metadata) === null || _d === void 0 ? void 0 : _d.items_count) || "1");
            products = [{
                    name: `Ordine Pizzaurum (${itemsCount} prodotti) - Pagamento Fallito`,
                    price: paymentIntent.amount / 100,
                    quantity: 1,
                    product_id: null,
                    extras: []
                }];
        }
        const totalPrice = paymentIntent.amount / 100;
        const orderData = {
            status: "failed",
            stripe_payment_intent_id: paymentIntent.id,
            payment: "online",
            is_paid: false,
            online_payment: true,
            price: totalPrice,
            customer_time: ((_e = paymentIntent.metadata) === null || _e === void 0 ? void 0 : _e.customer_time) || 'asap',
            user_id: ((_f = paymentIntent.metadata) === null || _f === void 0 ? void 0 : _f.user_id) || "706296cf-f659-4aa6-b079-c5f5525880c2",
            products: products,
            is_delivery: ((_g = paymentIntent.metadata) === null || _g === void 0 ? void 0 : _g.is_delivery) === "true" || false,
            is_custom_time: ((_h = paymentIntent.metadata) === null || _h === void 0 ? void 0 : _h.is_custom_time) === "true" || false,
            net_profit: 0,
            payment_issuer: 'Unknown',
            is_refunded: null,
            customer_review: null,
            report: null,
            stripe_refund_id: null,
            refunded_at: null,
            refunded_by: null
        };
        const { error: insertError } = await admin
            .from("orders")
            .insert(orderData);
        if (insertError)
            return new Error(`Error inserting failed order: ${insertError.message}`);
        console.log('Order marked as failed due to payment intent failure');
    }
    catch (error) {
        return new Error('Error processing payment intent failed');
    }
}
export async function handleInvoicePaymentSucceeded(invoice) {
    var _a;
    try {
        const admin = await supabaseAdmin;
        if (invoice.subscription) {
            console.log(`Subscription payment succeeded: ${invoice.subscription}`);
        }
        if ((_a = invoice.metadata) === null || _a === void 0 ? void 0 : _a.order_id) {
            const { error: updateError } = await admin
                .from("orders")
                .update({
                status: "pending",
                is_paid: true,
                customer_time: new Date().toISOString(),
            })
                .eq("id", invoice.metadata.order_id);
            if (updateError)
                return new Error(`Error updating order payment status: ${updateError.message}`);
            console.log(`Order ${invoice.metadata.order_id} marked as paid due to invoice payment success`);
        }
    }
    catch (error) {
        return new Error('Error processing invoice payment succeeded');
    }
}
export async function handleChargeFailed(charge) {
    try {
        const admin = await supabaseAdmin;
        if (charge.payment_intent) {
            const { data: order } = await admin
                .from("orders")
                .select("id, status")
                .eq("stripe_payment_intent_id", charge.payment_intent)
                .single();
            if (order) {
                console.log(`Found order ${order.id} for failed charge ${charge.id}`);
                if (order.status !== "failed") {
                    const { error: updateError } = await admin
                        .from("orders")
                        .update({
                        status: "failed",
                        is_paid: false
                    })
                        .eq("id", order.id);
                    if (updateError) {
                        console.log(`Error updating order status to failed: ${JSON.stringify(updateError, null, 2)}`);
                    }
                    else {
                        console.log(`✅ Updated order ${order.id} status to failed`);
                    }
                }
                else {
                    console.log(`Order ${order.id} is already marked as failed`);
                }
            }
            else {
                console.log(`No order found for failed charge payment intent: ${charge.payment_intent}`);
            }
        }
    }
    catch (error) {
        return new Error(`Error in handleChargeFailed: ${JSON.stringify(error, null, 2)}`);
    }
}
export async function handleChargeUpdated(charge) {
    try {
        const admin = await supabaseAdmin;
        if (charge.payment_intent) {
            const { data: order } = await admin
                .from("orders")
                .select("id, status")
                .eq("stripe_payment_intent_id", charge.payment_intent)
                .single();
            if (order) {
                console.log(`Found order ${order.id} for charge ${charge.id}`);
                let newStatus = order.status;
                let isPaid = order.status === "pending";
                if (charge.status === "succeeded") {
                    newStatus = "pending";
                    isPaid = true;
                }
                else if (charge.status === "failed") {
                    newStatus = "failed";
                    isPaid = false;
                }
                if (newStatus !== order.status) {
                    const { error: updateError } = await admin
                        .from("orders")
                        .update({
                        status: newStatus,
                        is_paid: isPaid
                    })
                        .eq("id", order.id);
                    if (updateError) {
                        console.log(`Error updating order status: ${JSON.stringify(updateError, null, 2)}`, true);
                    }
                    else {
                        console.log(`✅ Updated order ${order.id} status to ${newStatus}`);
                    }
                }
                else {
                    console.log(`Order ${order.id} status unchanged: ${order.status}`);
                }
            }
            else {
                console.log(`No order found for charge payment intent: ${charge.payment_intent}`);
            }
        }
    }
    catch (error) {
        return new Error(`Error in handleChargeUpdated: ${JSON.stringify(error, null, 2)}`);
    }
}
export async function handleInvoicePaymentFailed(invoice) {
    var _a;
    try {
        const admin = await supabaseAdmin;
        if (invoice.subscription) {
            console.log(`Subscription payment failed: ${invoice.subscription}`, true);
        }
        if ((_a = invoice.metadata) === null || _a === void 0 ? void 0 : _a.order_id) {
            const { error: updateError } = await admin
                .from("orders")
                .update({
                status: "failed",
                is_paid: false
            })
                .eq("id", invoice.metadata.order_id);
            if (updateError) {
                console.log(`Error updating order for failed invoice: ${updateError}`, true);
                throw updateError;
            }
        }
    }
    catch (error) {
        console.log(`Error in handleInvoicePaymentFailed: ${error}`, true);
        throw error;
    }
}
//# sourceMappingURL=stripe.js.map