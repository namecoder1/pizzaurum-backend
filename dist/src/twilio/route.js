import { httpError, propagateError, requireField } from "../../utils/errors.js";
import { server } from "../../lib/fastify.js";
import { client } from "../../lib/twilio.js";
import dotenv from "dotenv";
dotenv.config();
server.post('/api/twilio/verify', async (req, res) => {
    try {
        const { phone } = await req.body;
        requireField(phone, 'Phone number is required');
        const serviceSid = process.env.TWILIO_VERIFY_SID;
        const verification = await client.verify.v2
            .services(serviceSid)
            .verifications
            .create({ to: phone, channel: "sms" });
        return {
            success: true,
            message: 'OTP sent successfully',
            sid: verification.sid
        };
    }
    catch (error) {
        propagateError(error, 'Failed to send OTP');
    }
});
server.put('/api/twilio/verify', async (req, res) => {
    try {
        const { phone, code } = await req.body;
        requireField(phone, 'Phone number is required');
        requireField(code, 'OTP code is required');
        const serviceSid = process.env.TWILIO_VERIFY_SID;
        const verificationCheck = await client.verify.v2
            .services(serviceSid)
            .verificationChecks
            .create({ to: phone, code: code });
        if (verificationCheck.status === 'approved') {
            return {
                success: true,
                message: 'Phone number verified successfully'
            };
        }
        else {
            throw httpError(400, 'Invalid OTP code');
        }
    }
    catch (error) {
        propagateError(error, 'Failed to verify OTP');
    }
});
server.post('/api/twilio/send-message', async (req, res) => {
    try {
        const { phone, message } = await req.body;
        requireField(phone, 'Phone number is required');
        requireField(message, 'Message content is required');
        const twilioMessage = await client.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phone
        });
        return {
            success: true,
            message: 'Message sent successfully',
            sid: twilioMessage.sid
        };
    }
    catch (error) {
        propagateError(error, 'Failed to send message');
    }
});
//# sourceMappingURL=route.js.map