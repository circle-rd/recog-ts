---
title: recog-ts
description: Strict TypeScript implementation of Rapid7 Recog
---

# recog-ts

`recog-ts` is a strict TypeScript port of [Rapid7 Recog][recog]. It
provides:

- An **engine library** (`@recog-ts/core`) that loads Recog XML
  fingerprints, compiles their patterns, and returns full match
  analyses.
- A **REST API** (`@recog-ts/api`) built on Fastify with OpenAPI
  documentation served at `/docs`.
- An **MCP server** (`@recog-ts/mcp`) speaking Streamable HTTP by
  default, with optional SSE transport for legacy clients.

## Sections

- [API reference](/api/) — generated from TSDoc comments.
- [Contributing](https://github.com/recog-ts/recog-ts/blob/main/CONTRIBUTING.md) — engineering rules of the project.

[recog]: https://github.com/rapid7/recog
