# Code review

Use for a requested review or the final review of a substantial implementation.

1. Read AGENTS.md, selected skills and the complete scoped diff, including new
   files. Identify intended behavior and affected consumers before findings.
2. Check correctness, regressions, contract compatibility, dependency boundaries,
   readability, complexity and existing component reuse. Inspect async lifecycle,
   error handling, accessibility and evidenced performance risks where applicable.
3. Apply [test-quality](../skills/test-quality/SKILL.md) to regression protection
   and [verify-change](../skills/verify-change/SKILL.md) to check evidence. Verify
   documentation paths and commands match actual behavior.
4. Report actionable findings with file/line, trigger, impact, severity and evidence:
   high for broken critical behavior/security, medium for reproducible regressions,
   low for concrete maintainability issues. Mark uncertainty; avoid speculative
   architecture prescriptions and cosmetic finding lists. If none, say so and
   identify coverage limits. Review-only tasks do not authorize implementation.
5. Preserve unrelated changes and manual Git. Never stage, commit, push or create
   a pull request without explicit authorization.
