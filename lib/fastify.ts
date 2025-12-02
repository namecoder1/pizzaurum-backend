import fastify from 'fastify'
import dotenv from 'dotenv'
import fastifyCors from '@fastify/cors'

dotenv.config()

export const server = fastify({
  logger: {
    transport: {
      target: "@fastify/one-line-logger",
    },
  },
})
// Abilita CORS per tutte le origini (puoi restringere l'origine se necessario)
server.register(fastifyCors, {
  origin: true,
})

server.setErrorHandler((err: any, req: any, res: any) => {
  // Error has statusCode, use it
  const status = (err as any).statusCode || 500;
  req.log.error({ err }, 'Request error');

  // Message for client
  const message = status >= 500 ? 'Internal Server Error' : err.message;
  res.status(status).send({ message, detail: err.validation || undefined })
})

const port = Number(process.env.PORT || 4040)
const host = process.env.HOST || '0.0.0.0'

server.listen({ port, host }, (err, add) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server listening at ${add}`)
})
