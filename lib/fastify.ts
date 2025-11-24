import fastify from 'fastify'

export const server = fastify({
  logger: {
    transport: {
      target: "@fastify/one-line-logger",
    },
  },
})

server.setErrorHandler((err: any, req: any, res: any) => {
  // Error has statusCode, use it
  const status = (err as any).statusCode || 500;
  req.log.error({ err }, 'Request error');

  // Message for client
  const message = status >= 500 ? 'Internal Server Error' : err.message;
  res.status(status).send({ message, detail: err.validation || undefined })
})

server.listen({ port: 8080, host: '127.0.0.1',  }, (err, add) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server listening at ${add}`)
})