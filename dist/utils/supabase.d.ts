/**
 * Return the action message order status.
 * @param status The type of status of the order
 * @returns A string containing the action message for the given status
 */
export declare function getNotificationTitle(status: string): string;
/**
 * Return the message for each type of order status.
 * @param status The type of status of the order
 * @param orderNumber the number of the order (derived from the id)
 * @returns A string containing the message for the given status
 */
export declare function getNotificationBody(status: string, orderNumber: string): string;
//# sourceMappingURL=supabase.d.ts.map