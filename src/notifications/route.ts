import { server } from "../../lib/fastify.js";
import { requireField, httpError } from "../../utils/errors.js";

server.post('/api/notification/send', async (req, res) => {
  try {
    const { to, title, body, data, sound, priority, channelId } = await req.body as any;
    requireField(to && title && body, 'Missing required fields: to, title, body')
   
    const expoPushToken = Array.isArray(to) ? to : [to];

    const messages = expoPushToken.map(pushToken => ({
      to: pushToken,
      sound: sound || 'default',
      title,
      body,
      data: data || {},
      priority: priority || 'default',
      channelId: channelId || 'default'
    }))

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(messages)
    })

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Expo Push Service error: ${response.statusText} - ${errorText}`)
      throw httpError(response.status, `Expo Push Service error: ${response.status}`)
    }

    const result = await response.json()
    if (result.data) {
      const successCount = result.data.filter((ticket: any) => ticket.status === 'ok').length;
      const errorCount = result.data.filter((ticket: any) => ticket.status === 'error').length;
      
      console.info(`Notification sent: ${successCount} success, ${errorCount} errors`)
      result.data.forEach((ticket: any, index: number) => {
        if (ticket.status === 'error') {
          console.error('Push token error', ticket.message)
        }
      })
    }

    return {
      success: true,
      data: result.data,
      message: `Notification sent to ${expoPushToken.length} device(s)`
    }
  } catch (error) {
    throw httpError(500, 'Error sending push notification', error)  
  }
})