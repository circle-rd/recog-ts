import Fastify, { type FastifyInstance } from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import type { RecogEngine } from '@recog-ts/core';
import { registerHealthRoute } from './routes/health.js';
import { registerDbRoutes } from './routes/dbs.js';
import { registerMatchRoutes } from './routes/match.js';

declare module 'fastify' {
  interface FastifyInstance {
    /** Engine attached at server-build time; never undefined. */
    recog: RecogEngine;
  }
}

export interface ServerOptions {
  /** Engine instance to expose through the routes. Required. */
  readonly engine: RecogEngine;
  readonly logger?: boolean;
  readonly enableDocs?: boolean;
}

/**
 * Build a fully-configured Fastify instance.
 *
 * Single responsibility: wire routes and OpenAPI plugins. The
 * server intentionally does not own the engine lifecycle; the
 * caller injects one and keeps it alive.
 */
export async function buildServer(options: ServerOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger ?? false,
    bodyLimit: 4 * 1024 * 1024,
  });
  app.decorate('recog', options.engine);

  if (options.enableDocs !== false) {
    await app.register(fastifySwagger, {
      openapi: {
        info: {
          title: 'recog-ts API',
          description: 'REST interface to the recog-ts fingerprint engine.',
          version: '0.1.0',
        },
      },
    });
    await app.register(fastifySwaggerUi, {
      routePrefix: '/docs',
    });
  }

  await registerHealthRoute(app);
  await registerDbRoutes(app);
  await registerMatchRoutes(app);

  return app;
}
