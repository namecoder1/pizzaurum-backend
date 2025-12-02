import { isDev } from "../utils/general.js";
const baseUrl = isDev() ? 'http://localhost:8081' : process.env.BASE_URL;
// Funzione per inviare notifica push remote tramite Expo Push Service
export async function sendPushNotification(expoPushToken, data) {
    var _a;
    try {
        const response = await fetch(`${baseUrl}/api/notification/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: expoPushToken,
                title: data.title,
                body: data.body,
                data: {
                    orderId: data.orderId,
                    status: data.status,
                    orderNumber: data.orderNumber,
                    estimatedTime: data.estimatedTime,
                    type: 'order_status_update',
                    navigation: {
                        screen: 'orders',
                        params: {
                            openOrderId: data.orderId
                        }
                    }
                },
                sound: 'default',
                priority: 'high',
                channelId: 'orders'
            }),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.log(`❌ Errore nell'invio notifica push: ${response.status} - ${errorData.error || 'Unknown error'}`, true);
            return false;
        }
        const result = await response.json();
        console.log(`✅ Notifica push inviata con successo: ${((_a = result.data) === null || _a === void 0 ? void 0 : _a.status) || 'success'}`);
        return true;
    }
    catch (error) {
        console.log(`❌ Errore nell'invio notifica push: ${error}`, true);
        return false;
    }
}
// Funzione per inviare notifica push per cambio stato ordine
export async function sendOrderStatusPushNotification(expoPushToken, orderData) {
    return sendPushNotification(expoPushToken, orderData);
}
// Funzione per inviare notifica di benvenuto
export async function sendWelcomePushNotification(expoPushToken) {
    const data = {
        orderId: '',
        status: 'welcome',
        title: 'Benvenuto su Pizzaurum! 🍕',
        body: 'Grazie per aver scaricato la nostra app. Ordina la tua pizza preferita!'
    };
    return sendPushNotification(expoPushToken, data);
}
// Funzione per inviare notifica promozionale
export async function sendPromotionalPushNotification(expoPushToken, title, body, data) {
    const pushData = Object.assign({ orderId: '', status: 'promotional', title,
        body }, data);
    return sendPushNotification(expoPushToken, pushData);
}
//# sourceMappingURL=notifications.js.map