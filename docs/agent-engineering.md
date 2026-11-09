# Agent engineering

Movie Explorer is a reference for this TypeScript/React/NestJS toolchain, not a
claim of universal language or agent compatibility. A separate toolkit is out of
scope. Agents discover `.agents/skills/*/SKILL.md` and read applicable references
before implementation; tools without native discovery can read the same files.

| Owner | Responsibility |
| --- | --- |
| [AGENTS.md](../AGENTS.md) | Mandatory repository boundaries, skill routing and manual Git |
| Skills | Focused reusable methodology and project exceptions |
| Workflows | Understand -> Plan -> Implement -> Verify -> Report sequences |
| npm scripts and Vite Task | Executable commands, workspace graph and caching |
| Hooks and CI | Staged checks and mandatory automated gates |
| Documentation | Setup and maintained explanations; temporary audits stay in `.notes/` |

Choose [feature-change](../.agents/workflows/feature-change.md),
[dependency-update](../.agents/workflows/dependency-update.md), or
[code-review](../.agents/workflows/code-review.md). Implementation and targeted
corrections finish with [final-verification](../.agents/workflows/final-verification.md);
review-only tasks report findings and available verification evidence.
Plan independently verifiable milestones for larger work and continue authorized
steps without prompting for each edit. Preserve unrelated changes. Staging,
commits, pushes and pull requests remain manual unless explicitly authorized.

Run focused checks while editing, then `npm run check:changed` after meaningful
changes. Use `-- --base <ref>` to include committed branch changes since a merge
base, and `-- --dry-run` to inspect the plan. Staged, unstaged and nonignored
untracked paths are included; rename sides and deletions are selected. Missing
history, unknown/root paths and workspace manifest changes conservatively select
full verification. Dependencies propagate from workspace manifests; scripts own
that mapping. No selected plan proves skipped workspaces passed.

Run `npm run check:all` for final cross-workspace, dependency, CI or shared-tooling
changes, unless check:changed already passed the full plan for the same inputs.
Do not run equivalent full gates twice. Pure documentation/skill edits need agent
validation and diff review; executable tooling changes require full gates.
Full verification includes production audit, lint, typecheck, coverage, build and API
e2e. Failures stop execution; report subsequent checks as unrun. Cache restoration
is valid evidence only for its declared inputs; report it. Do not weaken gates.

Readability combines formatter/linter enforcement with contextual logical-group
review. Test quality evaluates regression value and deterministic synchronization;
removal requires demonstrated redundant protection. CI optimization requires
comparable run measurements, critical-path analysis and unchanged security gates.
See the focused skills rather than copying their procedures here.

`npm run validate:agents` validates skill metadata, identifiers, local Markdown
file references and root npm command references in agent documentation. It runs
in the existing root lint gate. It does not prove semantic consistency, external
link availability, anchor correctness or behavior preservation; final diff review
must cover those limits. No agent vendor configuration is required.
