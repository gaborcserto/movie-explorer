# Dependency update

Use for deliberate dependency/workspace-tooling changes; Dependabot owns routine
updates. Follow AGENTS.md skill selection and inspect existing working-tree changes.

1. Inspect package usage, actual release scope and breaking changes. Plan safe
   milestones for larger upgrades; avoid unrelated refactoring.
2. Update only necessary dependencies from the root with npm. Keep the lockfile
   aligned; do not hand-edit it. Continue authorized related work autonomously.
3. Run focused checks, then `npm run check:changed`. Use
   [verify-change](../skills/verify-change/SKILL.md) for scope and `npm run check:all`
   before final cross-workspace/dependency-tooling delivery unless check:changed
   already passed the same full plan.
4. Complete [final-verification](final-verification.md); inspect dependency scope,
   generated artifacts, secrets and unrelated updates in particular.
