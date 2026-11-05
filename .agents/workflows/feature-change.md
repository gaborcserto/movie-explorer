# Feature change

Use for a scoped feature or behavior change.

1. Follow the mandatory skill-selection process in `AGENTS.md`: identify the
   affected workspaces, read applicable nested instructions, and explicitly read
   every relevant skill and reference before implementation. Inspect contracts,
   configuration, and tests.
2. For React work, apply the ownership review in react-development and the
   canonical organization rules in code-readability. Use verify-change for
   structural-move checks after each batch. Identify downstream consumers and implement the smallest compatible change.
3. Add or update tests for observable behavior and preserve existing contracts.
4. Run targeted workspace checks using the commands in `AGENTS.md`.
5. Run broader root checks when the change crosses workspaces/contracts or
   affects build, CI, or shared tooling.
6. Review the diff, `git diff --check`, generated-file scope, and secrets
   before handoff.
