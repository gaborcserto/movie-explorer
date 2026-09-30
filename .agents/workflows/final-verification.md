# Final verification

Use when completing a larger phase or cross-cutting change.

1. Inspect the complete diff and run `git diff --check`.
2. Run root lint, typecheck, coverage, and build.
3. Run root e2e when API behavior, build ordering, or CI scope is involved.
4. Check changed paths, workspace names, commands, generated output, secrets,
   and unrelated changes. Report every check that was skipped.

For documentation-only or agent-infrastructure-only changes, validate
referenced paths and scripts and do not run the complete application suite
without a reason.
