import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { RecogEngine } from '@recog-ts/core';
import { ToolRegistry } from './tools.js';

/**
 * Builds and returns a configured `McpServer` for recog-ts.
 *
 * Single responsibility: assemble the server and register tools.
 * Transport binding is handled separately (see `transport.ts`).
 */
export function buildMcpServer(engine: RecogEngine): McpServer {
  const server = new McpServer(
    {
      name: 'recog-ts',
      version: '0.1.0',
    },
    {
      capabilities: { tools: {} },
    },
  );
  new ToolRegistry(engine).register(server);
  return server;
}
