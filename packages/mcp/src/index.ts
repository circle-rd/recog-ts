/**
 * Public exports of `@recog-ts/mcp`.
 *
 * @packageDocumentation
 */

export { buildMcpServer } from './server.js';
export {
  HttpTransportRunner,
  type TransportKind,
  type TransportOptions,
} from './transport.js';
export { ToolRegistry } from './tools.js';
