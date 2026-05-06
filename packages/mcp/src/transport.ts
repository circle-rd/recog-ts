import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

export type TransportKind = 'http' | 'sse';

export interface TransportOptions {
  readonly kind: TransportKind;
  readonly host: string;
  readonly port: number;
  /** Maximum request body size in bytes. Defaults to 4 MiB. */
  readonly maxBodyBytes?: number;
}

interface Session<T> {
  readonly server: McpServer;
  readonly transport: T;
}

const DEFAULT_MAX_BODY = 4 * 1024 * 1024;

/**
 * Boots an HTTP listener that exposes an MCP server over either
 * Streamable HTTP (default) or legacy SSE.
 *
 * Single responsibility: HTTP plumbing. Tool registration is
 * delegated to {@link buildMcpServer}.
 */
export class HttpTransportRunner {
  private readonly maxBody: number;

  public constructor(
    private readonly buildServer: () => McpServer,
    private readonly options: TransportOptions,
  ) {
    this.maxBody = options.maxBodyBytes ?? DEFAULT_MAX_BODY;
  }

  /** Starts the listener and resolves once it is bound. */
  public async start(): Promise<{ close: () => Promise<void> }> {
    if (this.options.kind === 'sse') {
      return this.startSse();
    }
    return this.startStreamable();
  }

  private async startStreamable(): Promise<{ close: () => Promise<void> }> {
    const sessions = new Map<string, Session<StreamableHTTPServerTransport>>();
    const httpServer = createServer((req, res) => {
      void this.handleStreamable(req, res, sessions);
    });
    await this.listen(httpServer);
    return {
      close: async () => {
        await this.closeHttp(httpServer);
        for (const { transport, server } of sessions.values()) {
          await transport.close();
          await server.close();
        }
        sessions.clear();
      },
    };
  }

  private async handleStreamable(
    req: IncomingMessage,
    res: ServerResponse,
    sessions: Map<string, Session<StreamableHTTPServerTransport>>,
  ): Promise<void> {
    try {
      const sessionIdHeader = req.headers['mcp-session-id'];
      const sessionId = Array.isArray(sessionIdHeader) ? sessionIdHeader[0] : sessionIdHeader;
      let session = sessionId !== undefined ? sessions.get(sessionId) : undefined;

      if (session === undefined) {
        session = await this.bootStreamableSession(sessions);
      }

      const body = await this.readJson(req);
      await session.transport.handleRequest(req, res, body);
    } catch (cause) {
      this.fail(res, cause);
    }
  }

  /**
   * Build a fresh server+transport pair for an incoming connection
   * with no recognised session id. Order matters: instantiate the
   * server first so the transport callback can capture it; register
   * the session synchronously once the SDK assigns the id.
   */
  private async bootStreamableSession(
    sessions: Map<string, Session<StreamableHTTPServerTransport>>,
  ): Promise<Session<StreamableHTTPServerTransport>> {
    const server = this.buildServer();
    const transport: StreamableHTTPServerTransport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (newId) => {
        sessions.set(newId, { server, transport });
      },
    });
    transport.onclose = () => {
      const id = transport.sessionId;
      if (id !== undefined) {
        sessions.delete(id);
      }
    };
    await server.connect(transport);
    return { server, transport };
  }

  private async startSse(): Promise<{ close: () => Promise<void> }> {
    const sessions = new Map<string, Session<SSEServerTransport>>();
    const httpServer = createServer((req, res) => {
      void this.handleSse(req, res, sessions);
    });
    await this.listen(httpServer);
    return {
      close: async () => {
        await this.closeHttp(httpServer);
        for (const { transport, server } of sessions.values()) {
          await transport.close();
          await server.close();
        }
        sessions.clear();
      },
    };
  }

  private async handleSse(
    req: IncomingMessage,
    res: ServerResponse,
    sessions: Map<string, Session<SSEServerTransport>>,
  ): Promise<void> {
    try {
      const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
      if (req.method === 'GET' && url.pathname === '/sse') {
        const transport = new SSEServerTransport('/messages', res);
        const server = this.buildServer();
        sessions.set(transport.sessionId, { server, transport });
        transport.onclose = () => {
          sessions.delete(transport.sessionId);
        };
        await server.connect(transport);
        return;
      }
      if (req.method === 'POST' && url.pathname === '/messages') {
        const sessionId = url.searchParams.get('sessionId');
        const session = sessionId === null ? undefined : sessions.get(sessionId);
        if (session === undefined) {
          res.writeHead(404).end('Unknown session');
          return;
        }
        await session.transport.handlePostMessage(req, res);
        return;
      }
      res.writeHead(404).end('Not found');
    } catch (cause) {
      this.fail(res, cause);
    }
  }

  /**
   * Read up to {@link maxBody} bytes of JSON. Aborts with 413 when
   * the limit is exceeded; throws on malformed JSON so the caller
   * can surface a typed error.
   */
  private async readJson(req: IncomingMessage): Promise<unknown> {
    if (req.method === 'GET' || req.method === 'DELETE') {
      return undefined;
    }
    return new Promise<unknown>((resolveBody, rejectBody) => {
      const chunks: Buffer[] = [];
      let total = 0;
      let aborted = false;
      req.on('data', (chunk: Buffer) => {
        if (aborted) {
          return;
        }
        total += chunk.length;
        if (total > this.maxBody) {
          aborted = true;
          rejectBody(
            Object.assign(new Error('Request body too large'), { httpStatus: 413 as const }),
          );
          req.destroy();
          return;
        }
        chunks.push(chunk);
      });
      req.on('end', () => {
        if (aborted) {
          return;
        }
        if (chunks.length === 0) {
          resolveBody(undefined);
          return;
        }
        try {
          const text = Buffer.concat(chunks).toString('utf8');
          resolveBody(text.length === 0 ? undefined : JSON.parse(text));
        } catch (err) {
          rejectBody(err);
        }
      });
      req.on('error', rejectBody);
    });
  }

  private fail(res: ServerResponse, cause: unknown): void {
    if (res.headersSent) {
      try {
        res.end();
      } catch {
        /* connection already torn down */
      }
      return;
    }
    const status =
      typeof (cause as { httpStatus?: number } | undefined)?.httpStatus === 'number'
        ? (cause as { httpStatus: number }).httpStatus
        : 500;
    const message = cause instanceof Error ? cause.message : String(cause);
    res.writeHead(status, { 'content-type': 'text/plain' }).end(message);
  }

  private listen(httpServer: ReturnType<typeof createServer>): Promise<void> {
    return new Promise((resolveListen, rejectListen) => {
      httpServer.once('error', rejectListen);
      httpServer.listen(this.options.port, this.options.host, () => {
        httpServer.off('error', rejectListen);
        resolveListen();
      });
    });
  }

  private closeHttp(httpServer: ReturnType<typeof createServer>): Promise<void> {
    return new Promise((resolveClose, rejectClose) => {
      httpServer.close((err) => {
        if (err !== undefined && err !== null) {
          rejectClose(err);
          return;
        }
        resolveClose();
      });
    });
  }
}
