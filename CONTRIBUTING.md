# Contributing to recog-ts

Thank you for considering contributing! This document codifies the
non-negotiable engineering rules for the project. They are designed
to keep the codebase small, predictable, and trustworthy.

## 1. Fail loud and fast — no defensive programming

- Never swallow errors. If a precondition is violated, throw a typed
  error (see `packages/core/src/errors.ts`) and let it propagate.
- Do not wrap internal logic in `try/catch` "just in case". Validate
  inputs **once**, at the trust boundary (XML parser, HTTP route,
  MCP tool), then trust internal invariants.
- Do not introduce default values that mask programmer mistakes.
  Missing required parameters should raise, not silently degrade.
- `console.log` is forbidden. Use the host logger (Fastify) or
  `console.warn` / `console.error` for genuine diagnostics.

## 2. Strict TypeScript

- `tsconfig.base.json` enables `strict`, `noImplicitAny`,
  `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and
  related flags. Do not relax them per file.
- `any` is banned (`@typescript-eslint/no-explicit-any: error`). Use
  `unknown` and narrow with type guards.
- Avoid `as` casts unless converting between two structurally
  compatible shapes that the compiler genuinely cannot infer. Never
  use `as unknown as T` to silence the compiler.
- Never use `@ts-ignore` or `@ts-expect-error`. If the compiler
  complains, fix the type.

## 3. Single-responsibility classes

- Every class has one clearly stated responsibility, called out in
  its TSDoc header.
- Prefer composition over inheritance. Inject collaborators through
  the constructor; never reach for module-level globals.
- Keep public surface area small. If a method is only used internally,
  make it `private`.

## 4. File-size budget

- **Target: 500 lines per file. Hard cap: 1000 lines.**
- Markdown documentation files are excluded from this rule.
- The `pnpm check:loc` script (run in CI) enforces the cap and emits
  a warning past the target. Refactor before exceeding the warning
  threshold; do not wait for the cap.

## 5. Tests

- Every public class has a focused unit test in
  `packages/<pkg>/test/unit/`.
- The full upstream Recog XML corpus must verify clean
  (`pnpm test:corpus`). New regex/parser features must add fixture
  tests that pin the new behaviour.
- Tests run against the `vendor/recog` submodule, kept at a pinned
  upstream SHA. Bumping the submodule is a normal PR.
- Aim for ≥ 85 % statement coverage on `@recog-ts/core`
  (`pnpm test:coverage` enforces the threshold).

## 6. Documentation

- Every exported symbol has a TSDoc block. The first sentence states
  the responsibility; subsequent paragraphs document semantics and
  edge cases.
- Documentation is generated from comments via TypeDoc and
  `typedoc-plugin-markdown`, then rendered by Docus
  (`docs/`). Run `pnpm docs:build` to verify.
- Do **not** create new top-level Markdown files unless explicitly
  required. Prefer adding a section to an existing document.

## 7. Commit hygiene

- Use Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`,
  `refactor:`, `test:`).
- One topic per PR. Keep diffs reviewable.
- A PR is mergeable when CI is green: lint, typecheck, build,
  tests (including corpus), and the LOC check.

## 8. Workspace layout

```
packages/
├─ core/   # @recog-ts/core — engine library (no I/O surface)
├─ api/    # @recog-ts/api  — Fastify REST surface
└─ mcp/    # @recog-ts/mcp  — MCP server (Streamable HTTP / SSE)
```

The engine has zero runtime I/O dependencies beyond `fs` for XML
loading. API and MCP packages depend on the engine; the engine never
depends back. Respect this direction.

## 9. Bumping the upstream Recog corpus

```sh
git submodule update --remote vendor/recog
pnpm test:corpus
```

If new fingerprints break corpus verification, **do not** disable the
test. Translate the new pattern construct in `RegexFactory` (with a
documented bridge) or fix the engine until the test passes.
