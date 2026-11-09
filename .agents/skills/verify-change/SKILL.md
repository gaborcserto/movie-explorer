---
name: verify-change
description: Select and run the smallest useful repository checks after a code, tooling, or documentation change, widening checks when workspace boundaries are affected.
---

# Verify a change

Use this skill to choose the smallest useful checks, then widen verification
when the change affects a boundary. Repository commands and quality rules are
in the root `AGENTS.md`.

1. Identify the changed workspace(s) and whether `packages/contracts`,
   dependencies/tooling, CI, or agent infrastructure is involved.
2. Start with the narrowest relevant check: the workspace lint/typecheck and
   focused tests. For a contract change, check contracts plus both apps.
3. For cross-workspace, dependency, build, CI, or quality-gate changes, use
   the full verification policy below rather than repeating individual root gates.
4. After structural moves, check every consumer and public export, relative
   imports and stylesheet URLs, test discovery and coverage inclusion. Run
   focused tests after each batch, then affected typechecks and production build.
   Preserve hook order, route entry points and stylesheet evaluation order;
   inspect the dependency graph for cycles through new entry points.
5. Review `git diff --check` and the final diff. Report checks that were not
   run and why.

Use the actual scripts from `AGENTS.md`; do not invent workspace commands or
claim that an unrun check passed.

## Changed-file and full verification

Inputs: working-tree status, task scope, comparison ref for committed branch work,
and the actual repository selector/configuration. After meaningful code/tooling
changes run `npm run check:changed`; inspect `-- --dry-run` when the plan is uncertain.
Use `-- --base <ref>` for committed branch changes: the script includes merge-base
changes plus staged, unstaged and nonignored untracked paths. Rename sides and
deletions participate. An empty working-tree selection excludes committed work
unless a base is supplied; it is not evidence that branch checks passed.

The selector owns workspace mappings and propagates dependencies from manifests,
including contracts consumers. Root configuration, unknown paths and workspace
manifest changes select all. Missing Git history or an invalid base falls back
to full checks. Never replace that fallback with an empty successful selection.

During implementation use focused tests; changed-file verification runs complete
affected workspace suites. Before final cross-workspace, CI, dependency or shared
tooling delivery, use `npm run check:all` (production audit plus existing gates).
Documentation/skill-only work normally needs `npm run validate:agents` and diff
review; if check:changed selects full checks conservatively, preserve that policy.

Completion: report selected files/workspaces, executed checks, skipped workspaces,
cache use and failures. The script stops on failure; later gates remain unrun.
Investigate introduced failures and distinguish pre-existing ones with evidence.
Never claim selected checks prove unrelated regression coverage. Validate selector
changes with isolated Git fixtures and command-plan tests, then full gates.

A successful check:changed run that selected the full plan satisfies final full
verification for the same inputs. Do not immediately repeat it as check:all, or
rerun individual root gates. Recheck only when subsequent changes invalidate the
results or an unresolved failure requires it. Pure documentation/skill edits use
agent validation and diff review; executable validator changes require full gates.
Review-only work without edits reports available check evidence and its limits;
it does not require executing the implementation workflow.
