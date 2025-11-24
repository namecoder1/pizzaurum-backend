import { server } from "../../lib/fastify.js";
import { httpError, requireField } from "../../utils/errors.js";

server.get('/api/debug/error', async (req, res) => {
  const { mode } = req.query as { mode?: string };
  requireField(mode, 'Query param "mode" is required');

  if (mode === 'badrequest') throw httpError(400, 'Forced bad request for testing');
  if (mode === 'servererror') throw httpError(500, 'Forced server error for testing');

  return {
    success: true,
    message: 'OK response',
    mode
  };
});
