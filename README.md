# recog-ts

Strict TypeScript implementation of [Rapid7 Recog][recog]:

- **Engine** (`@recog-ts/core`) — XML fingerprint loader, regex
  matcher, parameter interpolation, and verifier.
- **REST API** (`@recog-ts/api`) — Fastify server exposing match
  endpoints and OpenAPI documentation.
- **MCP server** (`@recog-ts/mcp`) — Model Context Protocol server
  with Streamable HTTP (default) or legacy SSE transport.

The upstream Recog XML corpus (51 fingerprint databases as of this
writing) is included as a Git submodule under `vendor/recog/` and
fully verified by the test suite.

## Quick start

```sh
git clone --recurse-submodules <this repo>
cd recog-ts
pnpm install
pnpm test            # runs unit + full corpus verification
pnpm build
```

### Run the API

```sh
RECOG_TS_XML_DIR=vendor/recog/xml pnpm start:api
# POST a banner
curl -sX POST http://localhost:3000/match \
  -H 'content-type: application/json' \
  -d '{"db":"http_servers","data":"Apache/2.4.38 (Debian)"}'
```

OpenAPI UI is served at `http://localhost:3000/docs`.

### Run the MCP server

```sh
pnpm start:mcp -- --transport http --port 8765
# or SSE:
pnpm start:mcp -- --transport sse  --port 8765
```

Tools registered:

- `recog.list_dbs`
- `recog.describe_db`
- `recog.match`
- `recog.match_auto`
- `recog.verify_db`

### Run via Docker

The published image at `ghcr.io/<owner>/recog-ts:latest` runs both
the API (port 3000) and the MCP server (port 8765) by default. Pick a
single mode with the entrypoint argument:

```sh
docker run --rm -p 3000:3000 ghcr.io/<owner>/recog-ts:latest api
docker run --rm -p 8765:8765 ghcr.io/<owner>/recog-ts:latest mcp
docker run --rm -p 3000:3000 -p 8765:8765 ghcr.io/<owner>/recog-ts:latest both
```

### Tags published

| Trigger | Tag |
|---------|-----|
| `v*.*.*` release | `latest`, `vX.Y.Z` |
| `workflow_dispatch` (Nightly Image) | `nightly` |

## Architecture

```
┌──────────────────┐     ┌────────────────┐     ┌────────────────┐
│ vendor/recog/xml │ ──▶ │ XmlLoader      │ ──▶ │ FingerprintDb  │
└──────────────────┘     └────────────────┘     └────────┬───────┘
                                                         │
                       ┌─────────────────────────────────┴──────────────┐
                       ▼                                                ▼
                 ┌───────────┐  match()                          ┌───────────┐
                 │ RecogEngine│ ───────────────────────────────▶ │   Verifier│
                 └─────┬─────┘                                    └───────────┘
                       │
        ┌──────────────┼─────────────────┐
        ▼              ▼                 ▼
 ┌───────────┐  ┌─────────────┐   ┌───────────────┐
 │ REST API  │  │  MCP server │   │  CLI (future) │
 └───────────┘  └─────────────┘   └───────────────┘
```

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the engineering rules.

## License

MIT — see `LICENSE`.

[recog]: https://github.com/rapid7/recog
