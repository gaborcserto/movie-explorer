---
name: test-quality
description: Design or review meaningful tests, investigate flakes, and evaluate test consolidation or removal with evidence; excludes visual test formatting and check selection.
---

# Test quality

Inputs: changed behavior, risk boundaries, existing tests, runner configuration,
fixtures, failure logs and any proposed replacement coverage.

1. State the regression each test prevents. Prefer observable outcomes and
   public contracts over private calls, type guarantees or copied algorithms.
   Use unit tests for isolated decisions, integration tests for collaborating
   boundaries, and E2E for critical assembled behavior. Different levels can
   protect different failure modes; similar names do not establish duplication.
2. Before consolidation/removal, record the removed scenario, surviving test,
   equivalent failure mode and evidence that the survivor would fail for that
   regression. Preserve authorization, API contract, timing, cancellation,
   cleanup and async lifecycle protection. Never target a lower test count.
3. Await interactions and completion signals. Use controlled deferred promises
   for races; fake clocks for expiry, debounce and retry behavior. Advance the
   relevant boundary explicitly, flush pending work as required by the runner,
   restore timers/mocks and close resources after each scenario. Do not replace
   timing assertions with immediate success checks. Avoid arbitrary sleeps;
   use bounded polling of observable state when no event signal is available.
4. Keep mocks at owned boundaries and model errors and response shapes faithfully.
   A mock-call assertion is useful when the call itself is the boundary contract;
   it is weak when it merely repeats implementation. Keep fixtures small and
   representative; isolate state, clocks, randomness, environment and network.
   Remove orphan fixtures only after checking all consumers.
5. Reproduce flakes with recorded seed, load, runner, order and logs. Distinguish
   product races from harness races; retries or longer timeouts are not fixes.
   Shared suite setup is safe only when mutable state is reset and teardown is
   reliable. Do not run competing coverage jobs into the same output directory.
6. Interpret coverage as missing-path evidence, not proof of test value. Inspect
   assertions and error paths; preserve gates. Ask verify-change to select checks.

Completion: focused tests protect the stated behavior, teardown is deterministic,
and proposed deletions have a replacement ledger. Report unresolved flakes and
checks not run. Presentation belongs to code-readability's testing reference.

## Reference lesson

[Upstream PR #22557](https://github.com/pingdotgg/t3code/pull/22557) demonstrates
reviewing low-signal tests and cleaning orphan fixtures. Its review restored
security timing coverage. Adopt evidence-based selection, not its deletion quota
or a blanket rejection of timers. No Movie Explorer test removal is authorized
merely by applying this skill.
