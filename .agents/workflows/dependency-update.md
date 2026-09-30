# Dependency update

Use for a deliberate manual dependency or workspace-tooling update. Routine
updates may also arrive through Dependabot.

1. Inspect the package, workspace usage, lockfile, release scope, and any
   breaking changes before editing.
2. Update the minimum required package versions with npm from the repository
   root; keep the lockfile aligned and do not hand-edit it.
3. Run the affected workspace checks, then root lint, typecheck, coverage,
   and build for cross-workspace or major changes. Run e2e when API/build
   behavior is affected.
4. Review the dependency diff, `git diff --check`, and ensure no generated
   artifacts, secrets, or unrelated updates were included.
