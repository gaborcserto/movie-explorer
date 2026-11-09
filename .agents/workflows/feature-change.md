# Feature change

Use for scoped implementation: Understand -> Plan -> Implement -> Verify -> Report.

1. Follow AGENTS.md skill selection. Inspect relevant instructions, working-tree
   changes, configuration, modules, contracts and consumers. For larger work,
   plan independently verifiable milestones and execute authorized steps without
   requesting a separate prompt for each edit.
2. For React, complete component ownership review before implementation. Preserve
   unrelated changes and use the smallest compatible implementation.
3. Apply [test-quality](../skills/test-quality/SKILL.md) when adding or updating
   observable regression protection. Run focused checks during each milestone.
4. Run `npm run check:changed` after meaningful changes. Delegate broader check
   selection to [verify-change](../skills/verify-change/SKILL.md).
5. Complete [final-verification](final-verification.md), including review and report.
