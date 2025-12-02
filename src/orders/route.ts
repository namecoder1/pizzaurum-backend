import { httpError, propagateError, requireField } from "../../utils/errors.js";
import { server } from "../../lib/fastify.js";
import { supabaseAdmin } from "../../lib/supabase.js";
import dotenv from 'dotenv'
import { isDev } from "../../utils/general.js";
import { sendOrderStatusPushNotification, type PushNotificationData } from "../../lib/notifications.js";
import { getNotificationBody, getNotificationTitle } from "../../utils/supabase.js";
dotenv.config()

const baseUrl = isDev() ? 'http://localhost:8081' : process.env.BASE_URL


server.post('/api/orders/assign-rider', async (req, res) => {
  try {
    const admin = supabaseAdmin
    const { orderId, riderId } = await req.body as any;
    requireField(orderId && riderId, 'orderId & riderId are required')

    const { data: orderCheck, error: checkError } = await admin
      .from('orders')
      .select('id, driver_id, status')
      .eq('id', orderId)
      .single()

    if (checkError) throw httpError(404, 'Error checking order', checkError.message)
    if (!orderCheck) throw httpError(404, 'Order not found')
    if (orderCheck.driver_id && orderCheck.driver_id !== riderId) throw httpError(409, 'Order already assigned to another rider')

    const { data: updatedOrder, error: updateError } = await admin
      .from('orders')
      .update({
        driver_id: riderId
      })
      .eq('id', orderId)
      .select()

    if (updateError) throw httpError(500, 'Error updating order', updateError.message)
    if (!updatedOrder || updatedOrder.length === 0) throw httpError(500, 'Order assignment failed')
    return {
      success: true,
      data: updatedOrder[0],
      message: 'Order assigned successfully'
    }
  } catch (error) {
    propagateError(error, 'Error assigning rider')
  }
})

server.post('/api/orders/complete-order', async (req, res) => {
  try {
    const admin = supabaseAdmin
    const { orderId, riderId } = await req.body as any;
    requireField(orderId && riderId, 'orderId & riderId are required')

    const { data: orderCheck, error: checkError } = await admin
      .from('orders')
      .select('id, driver_id, status, stripe_payment_intent_id, net_profit, payment_issuer')
      .eq('id', orderId)
      .single()

    if (checkError) throw httpError(404, 'Error checking order:', checkError.message)
    if (!orderCheck) throw httpError(404, 'Order not found')

    if (orderCheck.driver_id !== riderId) throw httpError(403, 'Order is not assigned to this rider')
    if (orderCheck.status !== 'delivering') throw httpError(400, 'Order must be in delivering status to be completed')
    
    const { data: completedOrder, error: completedError } = await admin 
      .from('orders')
      .update({
        status: 'delivered'
      })
      .eq('id', orderId)
      .eq('driver_id', riderId)
      .select()

    if (completedError) throw httpError(500, 'Error updating the order:', completedError.message)
    if (!completedOrder || completedOrder.length === 0) throw httpError(500, 'Order completion failed')
    
    if (orderCheck.stripe_payment_intent_id && (orderCheck.payment_issuer === 'Unknown' || !orderCheck.net_profit || orderCheck.net_profit === 0)) {
      try {
        const response = await fetch(`${baseUrl}/api/stripe/update-net-profit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            orderId: orderId,
            paymentIntentId: orderCheck.stripe_payment_intent_id
          })
        });

        const result = await response.json()

        if (response.ok && result.success) {
          console.log('Updated net profit for completed order:', orderId)
        } else {
          console.log('Failed to update net profit for completed order:', result.error)
        }
      } catch (error) {
        console.log('Error updating net profit for completed order:', error)
      }
    }

    return {
      success: true,
      data: completedOrder[0],
      message: 'Order completed successfully'
    }
  } catch (error) {
    propagateError(error, 'Error completing order')
  }
})

server.post('/api/orders/update-status', async (req, res) => {
  try {
    const admin = supabaseAdmin
    const { orderId, newStatus } = await req.body as any;
    requireField(orderId && newStatus, 'orderId and newStatus are required')

    const { data: orderData, error: orderError } = await admin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError) throw httpError(500, 'Error fetching order', orderError.message)
    if (!orderData || orderData.length === 0) throw httpError(404, 'Order not found')

    const { data: userData, error: userError } = await admin
      .from('users')
      .select('phone, name, expo_push_token')
      .eq('id', (orderData as any).user_id)
      .single()
    
    if (userError) console.error('Error fetching user:', userError.message)
    
    const { error: updateError } = await admin
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId)

    if (updateError) throw httpError(500, 'Error updating order status', updateError.message)

    const shouldSendSMS = (
      (orderData.is_delivery === false && newStatus === 'ready_to_pickup') || 
      (orderData.is_delivery === true && newStatus === 'delivering')
    );


    if (shouldSendSMS && userData?.phone) {
      try {
        let message = '';

        if (orderData.is_delivery === false && newStatus === 'ready_to_pickup') {
          message = `Il tuo ordine #${orderId.slice(0, 8)} è pronto per il ritiro in sede`
        } else if (orderData.is_delivery === true && newStatus === 'delivering') {
          message = `Il tuo ordine #${orderId.slice(0, 8)} è in consegna, aspetta una chiamata dal fattorino`
        }

        const smsResponse = await fetch(`${baseUrl}/api/twilio/send-message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            phone: userData.phone,
            message: message
          })
        })

        if (!smsResponse.ok) {
          console.error('Failed to send SMS notification')
        } else {
          console.log('SMS notification sent successfully')
        }
      } catch (error) {
        console.error('Error sending SMS notification', error)
      }
    }

    if (userData?.expo_push_token) {
      try {
        const notificationData: PushNotificationData = {
          orderId: orderId,
          status: newStatus,
          orderNumber: orderId.slice(0, 8).toUpperCase(),
          title: getNotificationTitle(newStatus),
          body: getNotificationBody(newStatus, orderId.slice(0, 8).toUpperCase())
        };

        const pushSuccess = await sendOrderStatusPushNotification(userData.expo_push_token, notificationData)

        if (pushSuccess) {
          console.log('Push notification sent successfully')
        } else {
          console.warn('Failed to send push notification for order', orderId)
        }
      } catch (error) {
        console.error('Error sending push notification', error)
      }
    } else {
      console.log('No Expo Push Token found for user', orderData.user_id)
    }

    if (newStatus === 'delivered' && orderData.stripe_payment_intent_id && (orderData.payment_issuer === 'Unknown' || !orderData.net_profit || orderData.net_profit === 0)) {
      try {
        const response = await fetch(`${baseUrl}/api/stripe/update-net-profit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            orderId: orderId,
            paymentIntentId: orderData.stripe_payment_intent_id
          })
        })

        const result = await response.json()
        if (response.ok && result.success) {
          console.log('Successfully updated net profit for delivered order', orderId)
        } else {
          console.error('Failed to update net profit for delivered order', orderId)
        }
      } catch (error) {
        console.error('Error updating net profit for delivered order', orderId, error)
      }
    }

    return {
      success: true,
      message: 'Order status updated successfully',
      orderId,
      newStatus
    }
  } catch (error) {
    propagateError(error, 'Error updating order status')
  }
})
