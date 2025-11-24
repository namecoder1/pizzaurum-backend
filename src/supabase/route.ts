import { createClient } from "@supabase/supabase-js";
import { server } from "../../lib/fastify.js";
import { supabaseAdmin } from "../../lib/supabase.js";
import { httpError, requireField } from "../../utils/errors.js";

const getAccessToken = (authorization?: string) => authorization?.replace("Bearer ", "");

const getUserClient = async (authorization?: string) => {
  const token = getAccessToken(authorization);
  if (!token) throw httpError(401, "Missing access token");

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData?.user) throw httpError(401, "Invalid or expired access token", authError?.message);

  const supabaseUser = createClient(
    process.env.SUPABASE_URL || "",
    process.env.SUPABASE_ANON_KEY || "",
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );

  return { supabaseUser, userId: authData.user.id };
};

const requireAdmin = async (authorization?: string) => {
  const token = getAccessToken(authorization);
  if (!token) throw httpError(401, "Missing access token");

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData?.user) throw httpError(401, "Invalid or expired access token", authError?.message);

  const { data: roleData, error: roleError } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', authData.user.id)
    .single();

  if (roleError) throw httpError(500, 'Error checking user role', roleError.message);
  if (roleData?.role !== 'admin') throw httpError(403, 'Admin access required');

  return { userId: authData.user.id };
};

server.get('/api/orders', async (req, res) => {
  try {
    const { supabaseUser } = await getUserClient(req.headers.authorization);

    const { data, error } = await supabaseUser
      .from('orders')
      .select('*');

    if (error) throw httpError(500, 'Error fetching orders', error.message);
    return data;
  } catch (error) {
    throw httpError(500, 'Unknown server error', error);
  }
});

server.get('/api/admin/orders', async (req, res) => {
  try {
    await requireAdmin(req.headers.authorization);

    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*');

    if (error) throw httpError(500, 'Error fetching all orders', error.message);

    return {
      success: true,
      data,
      message: 'All orders fetched successfully'
    };
  } catch (error) {
    throw httpError(500, 'Unknown server error', error);
  }
});

server.get('/api/orders/:id', async (req, res) => {
  try {
    const { supabaseUser } = await getUserClient(req.headers.authorization);
    const { id } = req.params as { id: string };
    requireField(id, 'Id is required to search for an order');

    const { data: orderData, error: fetchError } = await supabaseUser
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw httpError(500, 'Fetch error', fetchError.message);
    return {
      success: true,
      data: orderData,
      message: 'Order fetched successfully'
    };
  } catch (error) {
    throw httpError(500, 'Unknown server error', error);
  }
});

server.post('/api/orders', async (req, res) => {
  try {
    const { supabaseUser, userId } = await getUserClient(req.headers.authorization);
    const { data, userId: requestedUserId } = await req.body as any;

    requireField(data, 'Order payload is missing');
    if (requestedUserId && requestedUserId !== userId) {
      throw httpError(403, 'userId does not match authenticated user');
    }

    const orderData = {
      status: data.status,
      price: data.price,
      payment: data.payment,
      is_paid: data.is_paid,
      online_payment: data.online_payment,
      stripe_invoice_id: data.stripe_invoice_id,
      stripe_payment_intent_id: data.stripe_payment_intent_id,
      customer_time: data.customer_time,
      user_id: userId,
      products: data.products,
      is_delivery: data.is_delivery,
      is_custom_time: data.is_custom_time,
      net_profit: data.net_profit,
      payment_issuer: data.payment_issuer,
      is_refunded: null,
      customer_review: null,
      report: null,
      stripe_refund_id: null,
      refunded_at: null,
      refunded_by: null,
      is_email_sent: false
    };

    const { data: createdOrder, error: creatingError } = await supabaseUser
      .from('orders')
      .insert(orderData)
      .select('id')
      .single();

    if (creatingError) throw httpError(500, 'Error creating the order', creatingError.message);

    return {
      success: true,
      data: createdOrder,
      message: 'Order created successfully'
    };
  } catch (error) {
    throw httpError(500, 'Unknown server error', error);
  }
});
