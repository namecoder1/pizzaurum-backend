export interface PushNotificationData {
    orderId: string;
    status: string;
    orderNumber?: string;
    estimatedTime?: string;
    title: string;
    body: string;
}
export declare function sendPushNotification(expoPushToken: string, data: PushNotificationData): Promise<boolean>;
export declare function sendOrderStatusPushNotification(expoPushToken: string, orderData: PushNotificationData): Promise<boolean>;
export declare function sendWelcomePushNotification(expoPushToken: string): Promise<boolean>;
export declare function sendPromotionalPushNotification(expoPushToken: string, title: string, body: string, data?: any): Promise<boolean>;
//# sourceMappingURL=notifications.d.ts.map