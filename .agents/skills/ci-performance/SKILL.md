---
name: ci-performance
description: Measure CI bottlenecks and evaluate execution or cache changes while preserving security and quality gates; excludes speculative speed claims and prescribed job layouts.
---

# CI performance

Inputs: workflow and task graph, required checks, comparable run IDs and durations,
runner/cache conditions, failure rates and dependency installation timings.

1. Baseline several successful runs. Record revision, runner, queue/setup time,
   wall-clock time, cache hits, per-job and per-step times. Separate elapsed time
   from summed job time and runner minutes. Identify the critical path.
2. Inspect task dependencies before parallelizing. Consider runner startup and
   repeated installation overhead, npm download-cache effectiveness, coverage
   cost, duplicate lint/typecheck/build execution and resource contention.
   Validate cache inputs, environment, outputs and invalidation; a cache hit
   must not hide changed root tooling. Avoid adding a second cache without need.
3. Preserve security gates and failure propagation. Required aggregate checks
   must fail when any required lane fails or is cancelled/skipped unexpectedly.
   Separate security analysis only with its triggers and required status retained.
4. Change one justified bottleneck at a time. Compare several before/after runs
   under similar conditions, including failures and cold/warm caches. Report
   trade-offs in reliability, runner minutes and maintenance, not just speed.
   Use verify-change for local verification; local cache timings do not establish
   hosted CI improvements.

Completion: provide measured baseline, changed critical path, unchanged gates,
validation outcomes and measurement limitations. Further speed claims require
new comparable evidence; no universal job topology is prescribed.

## Movie Explorer reference

The existing CI uses three parallel lanes, a mandatory Quality Gates aggregate,
and a separate CodeQL workflow. The recorded previous five-run mean is 205.6s
(3:25.6); the task-supplied first optimized run is approximately 162s (2:42).
That single result is initial evidence, not a stable average or a controlled
comparison. No further improvement is claimed. Project YAML remains authoritative;
this methodology does not duplicate it.
