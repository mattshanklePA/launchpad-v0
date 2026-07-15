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
