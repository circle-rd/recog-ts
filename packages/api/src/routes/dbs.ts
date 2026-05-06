import type { FastifyInstance } from 'fastify';
import { UnknownDatabaseError } from '@recog-ts/core';
import { dbsResponseSchema } from '../schemas.js';

/** Registers the database listing routes. */
export async function registerDbRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/dbs',
    {
      schema: {
        description: 'List all loaded fingerprint databases with their metadata.',
        response: { 200: dbsResponseSchema },
      },
    },
    async () => {
      const dbs = app.recog.dbNames().map((name) => {
        const db = app.recog.getDb(name);
        const entry: Record<string, string | number> = {
          name: db.meta.name,
          count: db.fingerprints.length,
        };
        if (db.meta.matches !== undefined) {
          entry['matches'] = db.meta.matches;
        }
        if (db.meta.protocol !== undefined) {
          entry['protocol'] = db.meta.protocol;
        }
        if (db.meta.databaseType !== undefined) {
          entry['databaseType'] = db.meta.databaseType;
        }
        if (db.meta.preference !== undefined) {
          entry['preference'] = db.meta.preference;
        }
        return entry;
      });
      return { dbs };
    },
  );

  app.get<{ Params: { name: string } }>(
    '/dbs/:name',
    {
      schema: {
        description: 'Fetch metadata and fingerprint definitions for one database.',
        params: {
          type: 'object',
          required: ['name'],
          properties: { name: { type: 'string' } },
        },
      },
    },
    async (request, reply) => {
      try {
        const db = app.recog.getDb(request.params.name);
        return {
          name: db.meta.name,
          matches: db.meta.matches ?? null,
          protocol: db.meta.protocol ?? null,
          databaseType: db.meta.databaseType ?? null,
          preference: db.meta.preference ?? null,
          fingerprints: db.fingerprints.map((fp) => fp.toView()),
        };
      } catch (err) {
        if (err instanceof UnknownDatabaseError) {
          return reply.status(404).send({ error: err.message });
        }
        throw err;
      }
    },
  );
}
