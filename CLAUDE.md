# LaunchPad — repo instructions

## Before you push

Always run these and fix any failures before committing and pushing:

    pnpm typecheck
    pnpm lint
    pnpm test
    pnpm build

Do not push code you have not verified. If a command fails, fix it and re-run.
`pnpm build` catches production-build errors (e.g. a client component missing
the `"use client"` directive) that typecheck/lint/test do not. CI runs the same
checks, and a PR cannot merge until they pass.

## Definition of done for loop PRs

Before you push, and before you claim anything works:

1. Evidence, not assertion. Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` and paste the actual output in the PR body. "All tests pass" without output is not acceptable. If you did not run it, say so.

2. Test first for any logic change. If the change touches a pure function, a resolver, a reason builder, or an export, write the failing test before the implementation and show both states.

3. Tenant parity. This repo serves uspto, doc, dow and es2 from one codebase. State explicitly in the PR which tenants' rendered output changes and why. Unintended changes to another tenant are defects, not side effects.

4. Copy is code. A user-facing string is not a comment. If you change one, name every tenant that renders it.

5. Report what you did not do. Items in the issue you skipped, tests you could not write, and anything you changed that the issue did not ask for.
