import { server } from "../lib/fastify.js";
import "./supabase/route.js";
import "./sanity/route.js";
import "./stripe/route.js";
import './twilio/route.js';
import './resend/route.js';
import './admin/route.js';
import './notifications/route.js';
import './orders/route.js';
import './debug/route.js';
server.get('/', async (req, res) => {
    return { message: `Home Endpoint` };
});
//# sourceMappingURL=server.js.map