# Contributing to AuthorityLayer

AuthorityLayer is a runtime-safety library. Keep changes explicit, testable, and easy to review.

## Local Workflow

1. Install dependencies with `npm install`.
2. Run `npm test`.
3. Build the package with `npm run -w authority-layer build`.
4. Run `npm run -w authority-layer typecheck`.
5. Use `npm run example` to verify the contributor-facing demo still works.

## Repository Layout

- `packages/core/src/`: published library source
- `docs/`: API and enforcement reference
- `examples/`: runnable examples
- `tests/`: workspace smoke tests
- `src/`: top-level source map for contributors

## Change Expectations

- Keep halt behavior deterministic.
- Document new permissions, approval boundaries, or operator requirements.
- Add or update examples when the public API changes.
- Update docs when enforcement semantics change.
