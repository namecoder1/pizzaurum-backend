import { server } from "../../lib/fastify.js";
import { httpError, propagateError, requireField } from "../../utils/errors.js";
server.post('/api/resend/admin-invite', async (req, res) => {
    try {
        const { email, name, password } = await req.body;
        requireField(email && name && password, 'Email, name, and password are required');
        const response = await fetch('https://email.pizzaurum.store/api/send/admin-invite', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, name, password })
        });
        if (!response.ok) {
            throw httpError(500, 'Failed to send email');
        }
        else {
            return {
                success: true,
                message: 'Credentials email sent successfully'
            };
        }
    }
    catch (error) {
        propagateError(error, 'An error occurred while sending the email');
    }
});
server.post('/api/resend/purchase-email', async (req, res) => {
    try {
        const { firstName, orderId, email } = await req.body;
        requireField(firstName && orderId && email, 'First name, order ID, and email are required');
        const response = await fetch('https://email.pizzaurum.store/api/send/purchase-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ firstName, orderId, email }),
            signal: AbortSignal.timeout(10000)
        });
        if (!response.ok) {
            throw httpError(500, 'Failed to send email');
        }
        else {
            return {
                success: true,
                message: 'Purchase email sent successfully'
            };
        }
    }
    catch (error) {
        propagateError(error, 'An error occurred while sending the email');
    }
});
server.post('/api/resend/rider-invite', async (req, res) => {
    try {
        const { email, name, password } = await req.body;
        requireField(email && name && password, 'Email, name, and password are required');
        const response = await fetch('https://email.pizzaurum.store/api/send/rider-invite', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, name, password })
        });
        if (!response.ok) {
            throw httpError(500, 'Failed to send email');
        }
        else {
            return {
                success: true,
                message: 'Rider invite email sent successfully'
            };
        }
    }
    catch (error) {
        propagateError(error, 'An error occurred while sending the email');
    }
});
server.post('/api/resend/welcome-email', async (req, res) => {
    try {
        const { email, name } = await req.body;
        requireField(email && name, 'Email and name are required');
        const response = await fetch('https://email.pizzaurum.store/api/send/welcome-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, name })
        });
        if (!response.ok) {
            throw httpError(500, 'Failed to send email');
        }
        else {
            return {
                success: true,
                message: 'Welcome email sent successfully'
            };
        }
    }
    catch (error) {
        propagateError(error, 'An error occurred while sending the email');
    }
});
//# sourceMappingURL=route.js.map