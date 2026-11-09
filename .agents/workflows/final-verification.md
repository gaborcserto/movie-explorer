# Final verification

Use before delivery; check selection belongs to
[verify-change](../skills/verify-change/SKILL.md).

1. Review the complete diff and all selected skills, including untracked files.
   Complete [code-review](code-review.md). For audits, record exact scoped file
   counts, exclusions, exceptions and unresolved outcomes; sampling is insufficient.
2. Complete structural-move checks from verify-change when relevant. Run focused
   checks while iterating and `npm run check:changed` after meaningful changes.
   Require full verification for cross-workspace, dependency, CI or shared
   tooling changes: use `npm run check:all` unless check:changed already passed
   the full plan for the same inputs. Do not repeat equivalent passing gates. For documentation/skill-only work validate references and
   scripts with `npm run validate:agents`; a selector's conservative full fallback
   remains valid and must not be bypassed.
3. Investigate failures, fix introduced regressions and distinguish pre-existing
   failures with evidence. Never weaken gates, tests or assertions to get PASS.
   Later checks after a stopped command remain unrun.
4. Check paths, commands, generated output, secrets and unrelated changes. Run
   `git diff --check`. For formatting changes confirm a second pass is stable;
   machine checks do not establish semantic grouping or behavior preservation.
5. Report scope, actual check outcomes, cache use, skipped checks and remaining
   risks. Do not report PASS with unexplained unresolved violations. Preserve
   manual Git: no staging, commits, pushes or pull requests without authorization.
