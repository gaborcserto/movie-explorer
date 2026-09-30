# Verify a change

Use this skill to choose the smallest useful checks, then widen verification
when the change affects a boundary. Repository commands and quality rules are
in the root `AGENTS.md`.

1. Identify the changed workspace(s) and whether `packages/contracts`,
   dependencies/tooling, CI, or agent infrastructure is involved.
2. Start with the narrowest relevant check: the workspace lint/typecheck and
   focused tests. For a contract change, check contracts plus both apps.
3. For cross-workspace, dependency, build, CI, or quality-gate changes, run
   the root lint, typecheck, coverage, and build commands. Include e2e when
   API behavior, build ordering, or CI scope makes it relevant.
4. Review `git diff --check` and the final diff. Report checks that were not
   run and why.

Use the actual scripts from `AGENTS.md`; do not invent workspace commands or
claim that an unrun check passed.
