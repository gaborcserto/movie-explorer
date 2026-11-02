# AWS serverless deployment

This repository builds a static React SPA and a separate NestJS HTTP API.
The AWS foundation below is verified locally. No resources have been provisioned
and no live deployment, IAM authorization or public-origin checks have occurred.

AWS-08 reviewed the foundation against Favorites-based recommendations on
2026-11-02. Account-specific onboarding and detailed cost assumptions remain in
local operator notes. See the [operations guide](deployment/AWS_OPERATIONS.md)
for public deployment checks, smoke tests and recovery procedures. No cloud
activity is authorized by this local review.

## Build and runtime

Use Node.js 24 and npm 11.6.2, matching CI and the root package manager setting.
Install all workspace dependencies with `npm ci`, then run the root quality gates:

```sh
npm run lint
npm run typecheck
npm test
npm run coverage
npm run build
npm run test:e2e
git diff --check
```

Publish the contents of `apps/web/dist` to a static HTTPS host. Run the API from
the repository workspace using:

```sh
npm run start:prod --workspace @movie-explorer/api
```

The API runs `node dist/main` from `apps/api`. Retain its compiled output,
runtime workspace dependencies and the built `packages/contracts` workspace in
the runtime artifact. Build before pruning development dependencies. Vite preview
and the Nest watch server are local verification tools, not production servers.

## Environment

Set frontend variables **before building**. Rebuild when they change. Every
`VITE_*` variable is public; never place TMDB or OMDb credentials in one.

| Variable | Production value |
| --- | --- |
| `VITE_API_BASE_URL` | Public HTTPS API origin; empty or absent uses same-origin `/api/v1` in production |
| `VITE_SITE_URL` | Public frontend origin without a path, query or fragment; absent/empty makes a preview build noindex |
| `VITE_SOCIAL_IMAGE_URL` | Optional absolute public URL of an approved sharing image; omit until an asset is selected |

The development API default remains `http://localhost:4000`. Do not ship the
development example's localhost URL as the production API address.

Set API variables at runtime through the host's secret/environment mechanism:

| Variable | Behavior |
| --- | --- |
| `NODE_ENV` | Set to `production` |
| `PORT` | Integer 1–65535; default 4000 |
| `HOST` | Optional bind address, such as `0.0.0.0` for a container |
| `CORS_ORIGINS` | Comma-separated exact frontend origins, without trailing slashes; production defaults to no cross-origin access |
| `SWAGGER_ENABLED` | `true` or `false`; production defaults to false, development to true |
| `TMDB_ACCESS_TOKEN` | Required server-only secret |
| `TMDB_API_BASE_URL` | Normally `https://api.themoviedb.org/3` |
| `TMDB_IMAGE_BASE_URL` | Normally `https://image.tmdb.org/t/p/w500` |
| `TMDB_LANGUAGE`, `TMDB_REGION` | Optional provider locale and region settings |
| `TMDB_REQUEST_TIMEOUT_MS` | 1–60000 ms; default 8000 |
| `OMDB_API_KEY` | Optional server-only secret; IMDb ratings have existing unavailable states without it |
| `OMDB_API_URL` | Normally `https://www.omdbapi.com/` |

Do not copy local `.env` files into release artifacts. The API supports local
environment files for development; injected process variables take precedence.
Keep the configured external API origins trusted and HTTPS in production.

### First AWS environment checklist

The existing stack fixes the production listener/security settings and injects
only provider secrets; arbitrary shell environment values are not automatically
copied into Lambda. Verify this checklist against the synthesized template:

| Setting | Intended value/source |
| --- | --- |
| `NODE_ENV`, `HOST`, `PORT` | Stack: `production`, `0.0.0.0`, `8080` |
| `CORS_ORIGINS`, `SWAGGER_ENABLED` | Stack: empty, `false`; browser API calls are same-origin |
| `VITE_API_BASE_URL` | Empty during production build; do not copy the localhost development example |
| `VITE_SITE_URL` | Actual HTTPS SiteUrl output, set before frontend build |
| `VITE_SOCIAL_IMAGE_URL` | Omit until an approved public image exists |
| `TMDB_ACCESS_TOKEN` | Existing regional secret JSON key: `<server-only TMDB read token>` |
| `OMDB_API_KEY` | Same secret JSON key: `<server-only OMDb key>` or empty string |
| TMDB URLs / locale / timeout | Existing API defaults: HTTPS provider/image origins, `en-US`, no region filter, `8000ms` |
| OMDb URL / deadline | Existing HTTPS default; fixed `3000ms`, unavailable ratings when key absent |
| `AWS_LAMBDA_EXEC_WRAPPER`, adapter port/readiness | Stack: `/opt/bootstrap`, `8080`, `/health`, healthy `200`, async init |
| `AWS_REGION`, `AWS_CREDENTIALS_SECRET`, `AWS_ALARM_EMAIL` | Operator configuration for CDK/workflow, not frontend build secrets |
| `AWS_RELEASE_ID` | Unique reviewed release identifier (workflow: commit SHA); refreshes secret injection on redeploy |

The Lambda environment does not currently expose TMDB locale/timeout overrides
through CDK configuration. Defaults fit the reviewed budget; a future change
must explicitly update the stack and tests. Credentials never enter `VITE_*`.
Do not dump the resolved Lambda environment, log secret values, or enable Swagger
publicly to troubleshoot. Health validates the listener, not provider credentials.

## Routing and connectivity

Serve existing static assets, `robots.txt` and `sitemap.xml` as real files before
SPA fallback. Unknown asset paths must return 404, not the HTML document.
Deep links such as `/movie/27205`, `/series/1396/seasons/1` and `/person/6193`
must load the SPA document. Client `/tv/...` aliases redirect to `/series/...`;
prefer permanent HTTP redirects for those aliases at the chosen host.

For same-origin hosting, proxy `/api/v1/*` to Nest before the SPA fallback.
The Lambda adapter probes `/health`; CloudFront exposes the same process check at `/api/health`.
For separate origins, configure `VITE_API_BASE_URL` and `CORS_ORIGINS` together.
Check connectivity from a browser at the final HTTPS frontend origin, including
preflight requests and `Retry-After` visibility.

`GET /health` returns `200 {"status":"ok"}` once the API is serving requests.
It does not query TMDB/OMDb, expose credentials, or guarantee provider health.
Monitor provider errors separately. Swagger UI and `/api-docs-json` are absent
in production unless explicitly enabled; restrict access at the edge if enabled.

## SEO delivery and limitations

The application uses `BrowserRouter` with client-side requests and lazy detail
routes. It has no server-rendering entry point or finite entity manifest.
The build adds generic site Open Graph and Twitter metadata to the shared HTML;
it deliberately omits a shared canonical and `og:url`, which would misidentify
deep links as the homepage. An optional configured sharing image is included in
that initial HTML. No image, release date or rating is fabricated.

Loaded movie, series and person pages update title, description, canonical,
Open Graph, Twitter and JSON-LD using application-owned contracts, without extra
API requests. JSON-LD uses `Movie`, `TVSeries`, `Person` and homepage `WebSite`.
These are descriptive types, not a claim of eligibility for rich results.
Seasons and episodes retain their existing titles and remain noindex in this
baseline. Query variants, search, library, loading, error and not-found states
are noindex in the rendered document. Canonical entity URLs omit queries.

Client metadata is **not reliable dynamic social-card delivery**. Crawlers that
do not execute JavaScript receive generic site metadata. A static SPA fallback
also returns HTTP 200 for unknown entity/route URLs. CloudFront supplies initial noindex headers below. The remaining rendering follow-up must provide:

- HTTP 404/410 for nonexistent resources and 5xx for temporary server failures,
  where a renderer or routing layer can determine the correct status.
- A metadata rendering entry point for entity-specific social cards, or a finite
  prerendered entity set with a refresh and deletion policy. Use the application
  API, keep provider credentials server-side, escape metadata, and serve the
  same representation to users and crawlers. Do not add bot-only content.

No framework migration or speculative rendering server is included. Build-time
entity prerendering is deferred until the indexed catalog and refresh policy
are defined; the live discovery feeds and unbounded detail catalog cannot be
represented reliably by a guessed list of IDs.

With `VITE_SITE_URL`, the build emits an absolute, homepage-only `sitemap.xml`
and robots.txt allowing crawling and advertising that sitemap. It excludes
queries, private browser library state and unverified entities, and invents no
`lastmod` values. Add verified entity URLs only when the rendering/indexing
strategy supports them. Without `VITE_SITE_URL`, no sitemap is emitted,
robots.txt disallows crawling, and initial HTML is noindex. Also protect preview
environments at the host; robots directives are not access control.

Google documents the distinction between initial HTML, JavaScript rendering,
canonicals and noindex in its [JavaScript SEO guide](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics).
Open Graph fields follow the [Open Graph protocol](https://ogp.me/).


## AWS architecture and resources

The `MovieExplorer` CDK stack in `infrastructure/aws` uses `eu-central-1` by
default (`AWS_REGION` overrides it). It targets AWS commercial regions and one
production environment per account/region. A single public CloudFront HTTPS
origin serves two private/application origins:

```text
Browser -> CloudFront -> private S3 REST origin (OAC)
                    -> /api/* -> API Gateway HTTP API -> ARM64 Node.js 24 Lambda
                                                       -> TMDB / optional OMDb
GitHub -> environment-scoped OIDC -> CDK bootstrap roles -> CloudFormation
```

Resources: one encrypted, versioned, publicly blocked S3 bucket and bucket policy;
one CloudFront distribution, OAC, response-header policy and two small Functions;
one HTTP API, catch-all API route, Lambda integration/permission and default stage;
one Lambda and bounded runtime IAM role/policy; two 14-day log groups; three
CloudWatch alarms; one SNS topic with an optional email subscription. The existing
provider-credentials secret, runtime permission boundary, GitHub OIDC provider,
CDK bootstrap resources and deployment role are external prerequisites.

No VPC, NAT, EC2, load balancer, database, provisioned concurrency, WAF, paid CDN
plan or custom-domain resources are defined. CloudFront uses pay-as-you-go and
PriceClass 100. Regional resources carry Application/Environment cost tags.
S3 and logs are retained on stack deletion; removal requires explicit cleanup.

### Lambda and secrets

`npm run aws:package` builds the existing Nest entry point and creates
`infrastructure/aws/.artifacts/backend.zip`. It installs only locked API production
dependencies with lifecycle scripts disabled, copies allowlisted compiled files,
and excludes source `.env` files. ZIP entries have explicit Unix permissions;
`run.sh` is LF/755 even when built on Windows. The ZIP uses the AWS Lambda Web
Adapter ARM64 layer version 30 and `/opt/bootstrap`, following the
[official ZIP instructions](https://aws.github.io/aws-lambda-web-adapter/getting-started/zip-packages.html).
No second Nest bootstrap, bundler or Docker daemon is needed.

The function uses Node.js 24, 512 MiB, a 28-second timeout and five reserved
executions. It listens on 8080/0.0.0.0, waits for `/health` status 200 and uses async
adapter initialization for cold starts. No warmers are scheduled. Existing
validation, error responses, CORS, security headers and Swagger setup remain in
place. Swagger is disabled and cross-origin access denied in AWS; browser requests
use the same public origin. The public alias `/api/health` leaves existing
`/health` and its Swagger operation unchanged. Startup performs no provider fetch.

Create one existing Secrets Manager secret in the deployment region, with JSON
keys `TMDB_ACCESS_TOKEN` (required) and `OMDB_API_KEY` (use an empty string when
not configured). Default name: `movie-explorer/provider-credentials`. Store values
through a secure administrator interface; never pass them as CDK context, workflow
inputs, frontend variables or command-line literals. The stack contains only
CloudFormation dynamic references. CloudFormation resolves them using its
execution role; the Lambda role has no Secrets Manager access.

Resolved values live encrypted in Lambda environment configuration and are
accessible to principals with sufficient Lambda configuration privileges. Restrict
those principals. Rotation requires a function configuration update: change
`AWS_RELEASE_ID` (the workflow uses the commit SHA) and redeploy. Changing only a
secret value does not refresh a running function. Do not print deployment or
Lambda environment configuration when troubleshooting.

### Routing, caching and SEO

| Request | Delivery and caching |
| --- | --- |
| `/api/*`, `/api` | HTTPS HTTP API origin; all methods, cookies, query parameters and viewer headers except Host forwarded; caching disabled |
| `/assets/*` | S3/OAC, optimized cache policy; uploads set one-year immutable caching for Vite hashes |
| Known browser routes | GET/HEAD accepting HTML rewritten to `/index.html`; HTML caching disabled |
| `robots.txt`, `sitemap.xml`, other public files | Real S3 files; mutable uploads use no-cache |
| Missing assets/unknown paths | Native origin errors (private S3 commonly returns 403); never an HTML error rewrite |

The SPA rewrite recognizes home, search, library, movie, series, legacy tv, person,
season and episode paths. It excludes asset extensions and never processes API
behaviors. Browser Back/Forward remains React Router behavior. `/tv` aliases retain
existing client redirects. There is no distribution-wide 403/404-to-200 rule.
API 4xx/5xx remain API responses. Error-cache TTLs are zero without status/body
rewrites (S3 enforces its own one-second minimum); no personalized API responses
are cached.

Viewer-response code adds `X-Robots-Tag: noindex, follow` for query variants,
search, library, seasons and episodes. It handles both original and rewritten
request forms; CloudFront does not run viewer-response functions on origin errors.
Noindex is not access control. Test real response headers after deployment.

The workflow rebuilds the web app with the stack's SiteUrl as `VITE_SITE_URL` and
an empty `VITE_API_BASE_URL`. This preserves same-origin requests, canonical
origins and the existing homepage sitemap/robots generation. Before a first
CloudFront hostname exists, local builds remain safe noindex previews. Existing
client metadata/JSON-LD and all UI source/styles are preserved.

Entity-specific initial HTML is deliberately deferred. CloudFront Functions
cannot fetch domain data or render response bodies, and this application has no
shared HTML renderer or finite entity manifest. A follow-up should route HTML
entity requests for every user through a small regional renderer, reuse existing
application-owned API data, safely escape an exact versioned Vite template,
respect noindex/error states, and define caching, refresh and deletion rules.
Verify raw HTML and crawler fetches before claiming dynamic social previews.
No crawler-specific alternate content or SSR migration is included.

### Security, monitoring and spend controls

S3 accepts CloudFront reads only for this distribution and denies plaintext
transport. CloudFront redirects browser HTTP to HTTPS; API behaviors require
HTTPS. Responses add HSTS, nosniff, DENY framing and strict-origin referrers.
The default CloudFront certificate supports AWS's fixed legacy security policy;
TLS 1.2 minimum is configured only with an imported custom certificate. HTTPS is
required in both cases. A restrictive CSP is deferred pending report-only testing
of Google Fonts, TMDB images and YouTube; do not break the approved UI with an
untested policy.

HTTP API stage throttling is 5 requests/second with burst 10. Lambda reserved
concurrency is five, without provisioned-concurrency charges. These are aggregate
best-effort protections, not per-user quotas or billing caps. Verify the account
concurrency quota permits reserving five while leaving AWS's required unreserved
capacity. The execute-api endpoint is public and independently throttled; CloudFront
is not an authentication boundary. Do not globally trust forwarded IP headers.

HTTP APIs do not provide the REST API's direct WAF integration. CloudFront WAF
and paid edge rate rules require a separate cost/traffic decision. No paid WAF or
third-party service is enabled. Provider quotas and 429 handling remain relevant.

Lambda writes ordinary startup and sanitized provider-failure logs. HTTP API
access logs contain request ID, status, latency and integration status only;
no IPs, query values, authorization headers or bodies. Both log groups expire
entries after 14 days. Standard metrics alarm on at least five Lambda errors,
five throttles or five API 5xx responses in five minutes; missing data is healthy.
SNS sends alerts after the operator confirms the configured email subscription.
With no email configured, alarms exist but there is no email delivery.

Manually enable an account-level monthly $5 cost budget with actual and forecast
email thresholds (for example $1, $3 and $5), Free Tier notifications and cost
anomaly alerts where available. These are intentionally outside the regional
application stack and require billing authorization. Budget alerts are delayed
notifications and never guarantee a spending limit. The emergency response is to
stop abuse, set Lambda concurrency to zero and disable the distribution as needed;
review resulting costs and recovery before re-enabling.

S3 aborts incomplete multipart uploads after one day and expires noncurrent object
versions after 30 days. Current hashed assets are retained to support open browser
sessions and rollback. Periodically remove hashes no longer referenced by any
retained release. Monitor CDK asset buckets, retained logs, artifact storage and
old deployments; deleting a stack alone does not stop all retained storage costs.

### Low-traffic cost scenario

The 2026-11-02 Frankfurt estimates use $1.20/million HTTP API requests,
$0.0000133334/GB-second for ARM Lambda and $0.63/GB for standard log ingestion,
before benefits. Nearly idle/light portfolio gross scenarios are approximately
$0.74/$1.15 per month; moderate accidental traffic can exceed $5. Account-wide
allowances and credits can reduce actual bills, but are not guaranteed. These
estimates include storage, requests, logs, SNS, alarms, Secrets Manager, retained
assets and spikes. Confirm current account/plan eligibility and prices before
authorizing resources; there is no automatic shutdown or paid CDN plan. Detailed
assumptions and price sources remain in local cost-planning notes.

## Manual AWS setup and deployment

Account-specific onboarding, billing preparation, OIDC, CDK bootstrap and
cleanup steps are kept in local operator notes. Before deployment, select and
verify the intended account and region, review quotas and current pricing, and
configure billing alerts. Keep provider credentials in Secrets Manager and
long-lived AWS access keys out of GitHub. Bootstrap, resource creation,
deployment, rollback and deletion each require separate authorization; never
accept the CDK default `AdministratorAccess` execution policy.

The existing workflow is a manual `workflow_dispatch` on protected `main`,
opt-in through `AWS_DEPLOY_ENABLED`, and uses GitHub OIDC with a protected
`aws-production` environment. Its quality job has no AWS token permission; the
deployment job uses short-lived credentials after review. The workflow cannot
create or verify environment reviewers and branch protections. The OIDC trust
must use audience `sts.amazonaws.com` and subject
`repo:gaborcserto/movie-explorer:environment:aws-production`; environment branch
restrictions and the workflow's main-branch checks are both required. Keep
`AWS_DEPLOY_ENABLED` false until those protections and the account-specific
deployment diff have been reviewed. See the [operations guide](deployment/AWS_OPERATIONS.md)
for release gates, public smoke checks, recovery, rollback and retained-resource
cleanup. These controls bound access and capacity; they do not guarantee zero
spend or stop all abuse.

For a custom domain, obtain and validate an ACM certificate in `us-east-1`, set
`AWS_SITE_DOMAIN` and `AWS_CERTIFICATE_ARN` together, then redeploy and point DNS
to CloudFront. The stack creates no Route 53 zone, domain purchase or certificate.
Rebuild with the canonical HTTPS origin and verify canonical URLs, robots and
sitemap at that origin. The CloudFront default hostname requires no domain.
## Dependency security status

Rechecked on 2026-11-02 for AWS-08: the full audit remains 44 affected development
packages (3 low, 41 moderate); `npm audit --omit=dev` reports zero. No dependency
changes, forced upgrades or finding suppressions were needed. The classifications
below remain applicable; the artifact production install is checked separately.

As of 2026-11-01, the original full audit reported 54 affected packages (3 low,
47 moderate, 3 high, 1 critical); production reported four (two high, two moderate).
After remediation and adding CDK tooling, the full audit reports 44 affected
packages (3 low, 41 moderate), with no high/critical findings. Production and the
isolated Lambda production install report zero vulnerabilities. Counts are npm's
affected-package counts, not distinct exploit counts.

Remediated: multer 2.4.0 -> 2.5.0 and Swagger's js-yaml 5.3.0 -> 5.5.0 via targeted
root overrides; Handlebars 4.7.9 -> 4.7.10, undici 7.30.0 -> 7.30.1 and fast-uri
3.1.8 -> 3.1.9 through lockfile updates; Vite+ 1.2.0 -> 1.3.0 and aligned Vitest/
coverage 5.0.4 -> 5.0.5. Root Vite/Vitest anchors let npm install the existing core
alias consistently. Node typings now track Node 24. The Nest 11 application
and its production HTTP architecture are retained. Check the lockfile for exact
previous transitive versions; do not use `npm audit fix --force`.

Clean `npm ci` and the requested `npm ls` pass. An additional `npm ls --all`
diagnostic exits with ELSPROBLEMS for the Vite alias, overridden exact parent
versions and peer-resolution annotations (including trace-mapping/ansi-styles).
There are no missing nonoptional dependencies after repairing js-yaml's nested
argparse 3.0.3 lock entry. This npm 11 resolver diagnostic is retained as a tooling
limitation; production artifact isolation, runtime checks and all build/test
gates pass. Do not interpret the extended diagnostic as a clean dependency tree.

Remaining advisories are development-only:

| Advisory | Dependency chain, exposure and next action |
| --- | --- |
| [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4), low | deepmerge 4.3.1 via Nest CLI/fork-ts-checker and Jest configuration. No upstream patched version. Merge only repository-owned build/test configuration; wait for a patch or supported consumer replacement. |
| [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249), moderate | minimatch 3/9/10 via ESLint/plugins, Nest CLI, glob, test-exclude and CDK CLI. Fixed in 11.0.1+. Old consumers use incompatible exports/options; a blanket major override would break tooling. Keep patterns repository-owned and migrate consumers with upstream support. |
| [GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4), moderate | glob 10/13 through Jest/Nest tooling and test-exclude; fixed in 14.0.2+. AbortSignal cancellation can leave traversal running. Tooling uses bounded repository paths, not public request input. Upgrade consumers when compatible; glob 7 appears in npm's propagated dependency findings but is outside this direct advisory range. |

No affected package is shipped in the Lambda artifact or browser runtime. These
findings do not block this offline deployment foundation under the trusted-build
input assumption. Keep untrusted pull-request jobs credential-free, audit on each
release, and do not execute unreviewed configuration with deployment credentials.
They are not suppressed: `npm audit` still exits nonzero. A malicious repository
change is outside this reachability assessment and already executes build scripts;
review/protected environments remain essential. The production audit is a blocking
step in the deployment workflow.

## Local verification and limits

```sh
npm ci
npm audit
npm audit --omit=dev
npm ls
npm run lint
npm run typecheck
npm test
npm run coverage
npm run build
npm run test:e2e
npm run aws:package
npm run aws:test
npm run aws:synth
git diff --check
```

The infrastructure workspace participates in root lint/typecheck/test/coverage/build.
Its tests inspect CloudFormation, IAM boundaries, routing, noindex and workflow
controls without credentials. Package tests inspect ZIP permissions/content and
run the production artifact from a temporary directory outside the repository,
with isolated fake configuration and blocked upstream URLs. Synthesis uses no
lookups, SDK provider calls or live cloud operations.

No local test proves the managed Web Adapter layer executes on ARM64 Lambda,
that IAM policies authorize a real deployment, or that edge cache/header behavior
matches a live distribution. Those are explicitly manual first-deployment checks.
Dynamic social cards and entity-aware HTTP 404/503 HTML remain a documented
rendering follow-up. No UI/layout/style/interaction changes are intended.
