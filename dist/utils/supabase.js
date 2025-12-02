/**
 * Return the action message order status.
 * @param status The type of status of the order
 * @returns A string containing the action message for the given status
 */
export function getNotificationTitle(status) {
    switch (status) {
        case 'accepted':
            return 'Ordine confermato! 🎉';
        case 'preparing':
            return 'Ordine in preparazione! 👨‍🍳';
        case 'ready_to_pickup':
            return 'Ordine pronto! 🍕';
        case 'delivering':
            return 'Ordine in consegna! 🚚';
        case 'delivered':
        case 'completed':
            return 'Ordine consegnato! ✅';
        case 'cancelled':
        case 'failed':
            return 'Ordine annullato ❌';
        default:
            return 'Aggiornamento ordine';
    }
}
/**
 * Return the message for each type of order status.
 * @param status The type of status of the order
 * @param orderNumber the number of the order (derived from the id)
 * @returns A string containing the message for the given status
 */
export function getNotificationBody(status, orderNumber) {
    switch (status) {
        case 'accepted':
            return `Il tuo ordine #${orderNumber} è stato confermato e verrà preparato presto.`;
        case 'preparing':
            return `Il tuo ordine #${orderNumber} è in preparazione.`;
        case 'ready_to_pickup':
            return `Il tuo ordine #${orderNumber} è pronto per il ritiro!`;
        case 'delivering':
            return `Il tuo ordine #${orderNumber} è in consegna.`;
        case 'delivered':
        case 'completed':
            return `Il tuo ordine #${orderNumber} è stato consegnato. Buon appetito!`;
        case 'cancelled':
        case 'failed':
            return `Il tuo ordine #${orderNumber} è stato annullato.`;
        default:
            return `Il tuo ordine #${orderNumber} ha un nuovo stato.`;
    }
}
//# sourceMappingURL=supabase.js.map