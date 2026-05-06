import type { FastifyInstance } from 'fastify';
import { healthResponseSchema } from '../schemas.js';

/** Registers the GET /health route. */
export async function registerHealthRoute(app: FastifyInstance): Promise<void> {
  app.get(
    '/health',
    {
      schema: {
        description: 'Liveness probe. Reports the number of loaded fingerprint databases.',
        response: { 200: healthResponseSchema },
      },
    },
    async () => ({ status: 'ok', dbs: app.recog.dbNames().length }),
  );
}
