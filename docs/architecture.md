# AuthorityLayer Architecture

AuthorityLayer is organized as a small npm workspace around a single published core package.

## Layout

- `packages/core/src/`: core runtime, CLI, enforcement primitives, integrity helpers, and types
- `examples/`: runnable examples and minimal integration flows
- `docs/`: concepts, enforcement, API, integrity, and contributor notes
- `tests/`: workspace smoke tests
- `src/`: contributor-facing source map for the top-level workspace

## Runtime Model

The package exposes three main integration points:

- `AuthorityLayer`: runtime controller configured with enforcement primitives
- `authority.wrap(fn)`: run boundary that resets per-run state
- `authority.tool(name, fn)`: tool-call boundary used by loop guard and rate limiting
- `authority.recordSpend(usd)`: explicit cost-reporting hook for budget enforcement

The design keeps limits explicit and local. Callers decide what tools are available, when human approval is required, and how spend is calculated.
