# First deployment checks and recovery

Preparation only, reviewed 2026-11-02. No command here has been executed against
AWS. Local account setup notes retain the onboarding sequence;
[deployment.md](../deployment.md) owns architecture, environment variables,
upload commands and the existing workflow. Use a temporary non-root operator
session. Every deployment/containment/destruction action needs explicit approval.

## Release controls

Deploy AWS is `workflow_dispatch` only, gated on main and repository variable
`AWS_DEPLOY_ENABLED == 'true'`. It reruns audit, lint, typecheck, tests, coverage,
build, e2e, packaging, package smoke and synthesis without AWS privileges. The
dependent job enters `aws-production`, builds/tests again, then requests an OIDC
session. Only that job has `id-token: write`; workflow contents permission is read.
Production concurrency serializes jobs without canceling an active deployment.

Environment reviewers and protected-branch restrictions are **manual prerequisites**;
the YAML cannot enforce their existence. Approve only a specific main revision
whose account-specific CDK diff has been reviewed. No ordinary push or pull
request triggers infrastructure creation. Keep the enable flag false until setup
and first-deployment approval are complete. Required reviewer availability and
plan support must be checked in GitHub before enabling.

The workflow rebuilds from the same github.sha instead of transporting quality-job
artifacts. Locked dependencies and repeated gates validate that revision. CDK
deploys before web upload, then SiteUrl determines the production build's canonical
origin. Hashed assets upload first, mutable HTML/robots/sitemap second; no S3
`--delete`, no public ACLs. Only three mutable document paths are invalidated.
HTML caching is disabled, so a wildcard invalidation is unnecessary for SPA routes.
Artifacts are retained for 30 days even after a deployment failure: exact web
output, ZIP, outputs and cloud assembly. A health failure fails the job; S3
uploads are not an atomic release and there is no automatic frontend rollback.

The existing execution policy uses resource patterns where creation prevents an
exact ARN restriction (CloudFront creates on `*`, regional API/log delivery
control-plane exceptions). Use a dedicated portfolio account; these templates
are bounded service policies, not a formally proven minimal permission set.
The GitHub role can indirectly deploy application code through CDK roles; although
it cannot read the provider secret directly, trusted deployed code receives it.
Reviewers must therefore treat application/build/workflow changes as privileged.

## First public smoke check

Record revision, account/region, distribution ID, timestamp and real results in
a private release record. Never include provider secrets or Lambda environment
dumps. The first live checks remain outstanding after AWS-08.

1. Open the actual CloudFront **HTTPS** SiteUrl. Verify HTML, hashed JS/CSS and
   images; HTTP redirects for the frontend and HTTPS-only API behavior. The AWS
   default certificate uses its fixed TLS policy; no TLS1.2-minimum claim is made
   for that certificate. Confirm private bucket direct reads fail.
2. Check `GET <SiteUrl>/api/health` gives `200 {"status":"ok"}` and does not query
   providers. `/api-docs` and `/api-docs-json` must not expose Swagger. A missing
   `/api/v1/...` route must return JSON 404, never SPA HTML. Missing assets retain
   an origin error (private S3 commonly 403), never index.html.
3. Load Home, Movies, Series, Search, Movie Details, Series Details and deep links
   directly. Test filters/history, Favorites, Watched and Watchlist persistence.
   Check desktop/tablet/mobile widths without redesigning the existing UI.
4. Recommendations: empty Favorites → Popular, one/multiple Movie Favorites,
   multiple Series Favorites and mixed types → independent typed suggestions.
   Favorites/Watched are excluded; Watchlist remains eligible. Switch tabs
   repeatedly and verify retained results/scroll with no repeated fetches.
   Test empty/partial/outage and recovery in a controlled staging fixture rather
   than intentionally disrupting production provider credentials.
5. Confirm POST `/api/v1/recommendations/personalized` works through CloudFront,
   sends `private, no-store` and rejects extra fields/invalid media/over-limit IDs.
   GET selections are no-store; no personal responses are CDN cached. Check
   429/Retry-After behavior without load-testing production without approval.
6. Inspect browser Network: API URLs are same-origin `/api/v1`; no TMDB/OMDb
   credential appears in JS, requests or response bodies. API CORS grants no
   foreign origin. CORS does not stop non-browser API callers. Verify HSTS,
   nosniff, DENY framing/referrer policy, correct JS content type and asset
   immutable headers; mutable files use no-cache. Check robots/sitemap SiteUrl.
7. In CloudWatch, inspect actual adapter initialization, Lambda Duration,
   Init Duration, Max Memory Used, Errors/Throttles, HTTP API 5xx and access logs.
   The 512MiB/28s setup is an unbenchmarked starting point. Measure cold/warm
   recommendation paths before tuning; verify the 25s client budget on real AWS.
8. Confirm SNS subscription and alert delivery. Alarms on Lambda Errors alone
   do not detect Nest's handled 502/504 responses; HTTP API 5xx is the relevant
   companion alarm. Partial 200 responses/provider 429s do not trigger 5xx alarms;
   use sanitized provider warnings and a manual availability check during launch.
9. Check Billing/credit usage when delayed usage arrives and daily in the first
   week. Verify operational emails and $1/$3/$5 notifications separately.

## Recovery procedures

Always establish the failing layer using response status, request ID and sanitized
logs. Do not print Lambda configuration or provider URLs containing API keys.

| Failure | Investigation and separately approved recovery |
| --- | --- |
| Broken frontend | Preserve failing artifacts. Restore the last successful **matching** web artifact: hashes first, then mutable files with their original Cache-Control, invalidate the three document paths and verify a fresh session/deep link. S3 versioning can recover HTML if artifacts are missing, but every referenced hash must also exist. |
| Lambda fails initialization | Inspect init logs, layer ARN/architecture, executable LF launcher, Node24 runtime, secret key names, HOST/PORT and readiness path. Redeploy a known-good backend/cloud assembly. Do not change the adapter entry point or increase deadlines speculatively. |
| Gateway routing errors | Compare CloudFront `/api/*` behavior, HTTPS origin hostname without viewer Host, HTTP API `/api/{proxy+}` ANY route, stage and Lambda permission. `/api/health` is the public check; direct gateway is also public. A direct `/health` gateway route is not defined. |
| Missing TMDB credential | API startup must fail, not serve fake data. Correct the existing secret securely. Change AWS_RELEASE_ID and redeploy to force dynamic-reference refresh; changing the secret alone does not update running Lambda environments. OMDb may be empty and ratings should show unavailable. |
| Stale CloudFront content | Check request path, deployed HTML hashes, response Cache-Control and invalidation completion. Restore/re-upload mutable files with no-cache and invalidate index/robots/sitemap. Never overwrite an immutable hash with different bytes. |
| Incorrect environment | Server values need a reviewed Lambda configuration deployment; frontend VITE values require a rebuild. Empty VITE_API_BASE_URL is intentional. Use actual SiteUrl for VITE_SITE_URL; no credentials in any VITE value. |
| Unexpected cost/abuse | Disable workflow flag, investigate Bills/Cost Explorer service/region and metrics. If approved, set Lambda reserved concurrency to zero (API stops), reduce gateway throttle or disable CloudFront as appropriate. Disabling CloudFront alone leaves public execute-api reachable; concurrency zero alone leaves CDN/API request charges possible. Verify all entry points and delayed billing. |

### Rollback to a previous release

1. Stop new releases and select a known-good artifact/revision. Record the current
   release and intended rollback. Review current/previous contracts together;
   restore frontend/backend from the same release where compatibility is uncertain.
2. Review the saved cloud assembly and its asset manifest paths. The workflow ZIP
   plus cloud assembly are rollback inputs, not a guarantee that every external
   CDK asset path remains usable after extraction. Verify referenced assets exist
   in the bootstrap bucket or restore/repackage them from the saved artifact.
   If uncertain, rebuild the known revision in a separate checkout, regenerate
   the assembly with the intended configuration and review its diff.
3. Obtain approval for the rollback diff. From the installed CDK workspace command,
   deploy the previous verified assembly using `--app <saved-cdk.out>` and
   `deploy MovieExplorer`. This is a live mutation. CloudFormation automatically
   rolls back a failed infrastructure update where possible; inspect stack events
   and do not assume this restores S3 uploads or a partially failed stack.
4. Upload matching saved web files, hashes before mutable files. Invalidate mutable
   documents; run public smoke checks. Correct secret values separately if needed:
   rollback cannot restore old external secret values automatically.
5. Record real outcomes, check alarms and billing. Do not rewrite Git history.

For resource removal and retained versions/logs/secrets/toolkit cleanup, consult
the local account setup notes and obtain separate approval. No automatic
shutdown, rollback service or additional paid resource is introduced.
