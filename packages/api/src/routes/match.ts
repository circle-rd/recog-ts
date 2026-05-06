import type { FastifyInstance } from 'fastify';
import { UnknownDatabaseError, decodeBanner, type BannerEncoding } from '@recog-ts/core';
import {
  matchAutoRequestSchema,
  matchAutoResponseSchema,
  matchRequestSchema,
  matchResponseSchema,
} from '../schemas.js';

interface MatchRequestBody {
  readonly db: string;
  readonly data: string;
  readonly encoding?: BannerEncoding;
}

interface MatchAutoRequestBody {
  readonly data: string;
  readonly encoding?: BannerEncoding;
  readonly dbs?: readonly string[];
}

/** Registers the match routes. */
export async function registerMatchRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: MatchRequestBody }>(
    '/match',
    {
      schema: {
        description: 'Match a banner against a single named fingerprint database.',
        body: matchRequestSchema,
        response: { 200: matchResponseSchema },
      },
    },
    async (request, reply) => {
      const { db, data, encoding } = request.body;
      try {
        const result = app.recog.match(db, decodeBanner(data, encoding));
        if (result === null) {
          return { matched: false };
        }
        return { matched: true, result };
      } catch (err) {
        if (err instanceof UnknownDatabaseError) {
          return reply.status(404).send({ error: err.message });
        }
        throw err;
      }
    },
  );

  app.post<{ Body: MatchAutoRequestBody }>(
    '/match/auto',
    {
      schema: {
        description: 'Match a banner against every loaded database (or a subset).',
        body: matchAutoRequestSchema,
        response: { 200: matchAutoResponseSchema },
      },
    },
    async (request, reply) => {
      const { data, encoding, dbs } = request.body;
      try {
        const matches = app.recog.matchAll(decodeBanner(data, encoding), dbs);
        return { matches };
      } catch (err) {
        if (err instanceof UnknownDatabaseError) {
          return reply.status(404).send({ error: err.message });
        }
        throw err;
      }
    },
  );
}
