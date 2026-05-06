import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { RecogEngine, UnknownDatabaseError, Verifier, decodeBanner } from '@recog-ts/core';

/**
 * Registers the recog-ts tools on an `McpServer` instance.
 *
 * Single responsibility: tool wiring. Engine ownership is the
 * caller's concern.
 */
export class ToolRegistry {
  public constructor(
    private readonly engine: RecogEngine,
    private readonly verifier: Verifier = new Verifier(),
  ) {}

  /** Register every tool. */
  public register(server: McpServer): void {
    this.registerListDbs(server);
    this.registerDescribeDb(server);
    this.registerMatch(server);
    this.registerMatchAuto(server);
    this.registerVerifyDb(server);
  }

  private registerListDbs(server: McpServer): void {
    server.registerTool(
      'recog.list_dbs',
      {
        description: 'List all loaded fingerprint databases with their metadata.',
        inputSchema: {},
      },
      async () => {
        const dbs = this.engine.dbNames().map((name) => {
          const db = this.engine.getDb(name);
          return {
            name: db.meta.name,
            matches: db.meta.matches ?? null,
            protocol: db.meta.protocol ?? null,
            count: db.fingerprints.length,
          };
        });
        return {
          content: [{ type: 'text', text: JSON.stringify({ dbs }, null, 2) }],
          structuredContent: { dbs },
        };
      },
    );
  }

  private registerDescribeDb(server: McpServer): void {
    server.registerTool(
      'recog.describe_db',
      {
        description: 'Describe a single database including its fingerprint definitions.',
        inputSchema: { name: z.string().min(1) },
      },
      async ({ name }) => {
        const db = this.engine.getDb(name);
        const payload = {
          name: db.meta.name,
          matches: db.meta.matches ?? null,
          protocol: db.meta.protocol ?? null,
          fingerprints: db.fingerprints.map((fp) => fp.toView()),
        };
        return {
          content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
        };
      },
    );
  }

  private registerMatch(server: McpServer): void {
    server.registerTool(
      'recog.match',
      {
        description: 'Match a banner against a single named fingerprint database.',
        inputSchema: {
          db: z.string().min(1),
          data: z.string(),
          encoding: z.enum(['utf8', 'base64']).optional(),
        },
      },
      async ({ db, data, encoding }) => {
        try {
          const result = this.engine.match(db, decodeBanner(data, encoding));
          const payload = result === null ? { matched: false } : { matched: true, result };
          return {
            content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
          };
        } catch (err) {
          if (err instanceof UnknownDatabaseError) {
            return {
              content: [{ type: 'text', text: err.message }],
              isError: true,
            };
          }
          throw err;
        }
      },
    );
  }

  private registerMatchAuto(server: McpServer): void {
    server.registerTool(
      'recog.match_auto',
      {
        description: 'Match a banner against every loaded database (or a subset).',
        inputSchema: {
          data: z.string(),
          encoding: z.enum(['utf8', 'base64']).optional(),
          dbs: z.array(z.string().min(1)).optional(),
        },
      },
      async ({ data, encoding, dbs }) => {
        const matches = this.engine.matchAll(decodeBanner(data, encoding), dbs);
        return {
          content: [{ type: 'text', text: JSON.stringify({ matches }, null, 2) }],
        };
      },
    );
  }

  private registerVerifyDb(server: McpServer): void {
    server.registerTool(
      'recog.verify_db',
      {
        description: 'Verify every example in a database against its parent fingerprint.',
        inputSchema: { name: z.string().min(1) },
      },
      async ({ name }) => {
        const db = this.engine.getDb(name);
        const report = this.verifier.verifyDb(db);
        return {
          content: [{ type: 'text', text: JSON.stringify(report, null, 2) }],
        };
      },
    );
  }
}
