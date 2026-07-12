# LaunchPad — repo instructions

## Before you push

Always run these and fix any failures before committing and pushing:

    pnpm typecheck
    pnpm lint
    pnpm test

Do not push code you have not verified. If a command fails, fix it and re-run.
CI runs the same checks plus `pnpm build`, and a PR cannot merge until they pass.
