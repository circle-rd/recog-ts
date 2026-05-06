# AGENTS

This file documents conventions for AI coding agents working on
`recog-ts`. It is enforced by humans during code review and codified
in `CONTRIBUTING.md`.

## Hard rules

- **No `any`.** Use `unknown` and narrow.
- **No defensive programming.** Throw typed errors at the boundary;
  trust internal invariants.
- **One responsibility per class.** Small files (target 500 LOC,
  cap 1000).
- **Tests required.** New behaviour must come with a unit fixture and
  must not regress the corpus suite (`pnpm test`).
- **No new top-level Markdown** unless the user explicitly asks.

## Repository tour

| Path | Purpose |
|------|---------|
| `packages/core/` | Pure engine library. Loader, regex factory, fingerprint, db, verifier. |
| `packages/api/`  | Fastify REST surface. |
| `packages/mcp/`  | MCP server (Streamable HTTP / SSE). |
| `vendor/recog/`  | Submodule pinned to `rapid7/recog`. |
| `scripts/`       | Tooling (LOC budget, Docker entrypoint). |
| `.github/workflows/` | CI, Release, Nightly Image. |

## Useful commands

```sh
pnpm install
pnpm build
pnpm test            # all tests, including full corpus verification
pnpm test:corpus     # only the upstream corpus check
pnpm lint
pnpm typecheck
pnpm check:loc       # enforce file size budget
pnpm docs:build      # generate TypeDoc -> Docus
```
