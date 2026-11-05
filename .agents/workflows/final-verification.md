# Final verification

Use when completing a larger phase or cross-cutting change.

1. Recheck all selected skills, inspect the complete diff, and run
   `git diff --check`. For repository-wide audits, enumerate maintained files
   and exclusions, record each file's review outcome, and report exact inspected,
   modified, excluded, and unresolved counts. Sampling is insufficient.
2. For file moves, complete verify-change structural checks, including public
   exports, imports, test discovery, hook order and stylesheet order. Run root lint, typecheck, coverage, and build.
3. Run root e2e when API behavior, build ordering, or CI scope is involved.
4. Check changed paths, workspace names, commands, generated output, secrets,
   and unrelated changes. Report every check that was skipped.
5. For formatting work, confirm a second formatter pass is stable and review
   contextual conventions in addition to machine checks. Document justified
   exceptions; do not report PASS with unexplained unresolved violations.

For documentation-only or agent-infrastructure-only changes, validate
referenced paths and scripts and do not run the complete application suite
without a reason.
