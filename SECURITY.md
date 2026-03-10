# Security Notes

AuthorityLayer is a local runtime-enforcement library. It helps callers define and enforce operational boundaries for AI agents, but it does not replace broader application security review.

## Scope

- AuthorityLayer enforces configured budget, loop, and tool-throttle limits.
- AuthorityLayer does not sandbox arbitrary code execution.
- AuthorityLayer depends on the host application to decide what tools are exposed and when approvals are required.

## Evaluation Guidance

Before release, verify halt behavior with repeatable tests or example runs that cover:

- budget exhaustion
- loop-limit enforcement
- tool-throttle enforcement
- error handling around `EnforcementHalt`

## Reporting Issues

If you discover a security issue in the library, report it privately to the maintainers before opening a public issue.
