# Feature change

Use for a scoped feature or behavior change.

1. Read `AGENTS.md`, inspect the affected workspace boundaries, contracts,
   configuration, and tests.
2. Identify downstream consumers and implement the smallest compatible change.
3. Add or update tests for observable behavior and preserve existing contracts.
4. Run targeted workspace checks using the commands in `AGENTS.md`.
5. Run broader root checks when the change crosses workspaces/contracts or
   affects build, CI, or shared tooling.
6. Review the diff, `git diff --check`, generated-file scope, and secrets
   before handoff.
