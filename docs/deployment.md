# AWS serverless deployment

This repository builds a static React SPA and a separate NestJS HTTP API.
The AWS foundation below is verified locally. No resources have been provisioned
and no live deployment, IAM authorization or public-origin checks have occurred.

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

Pricing reviewed 2026-11-01. Illustrative monthly usage: 100,000 CloudFront requests,
1 GB delivery, 10,000 API requests, average Lambda duration 1 second at 512 MiB,
0.1 GB logs, less than 1 GB total S3/CDK storage, three standard alarms and one
provider secret. Budget approximately $0.50-2/month under these assumptions,
excluding taxes, account-wide competing usage and unusual deployment churn.
The $0-5 objective is not a guarantee.

- [CloudFront pricing/FAQ](https://aws.amazon.com/cloudfront/faqs/): pay-as-you-go
  monthly allowance is 1 TB delivery and 10 million requests across the account;
  this is distinct from flat-rate plans. Two Function invocations per HTML
  request and invalidations are additional usage dimensions. No paid plan is selected.
- [HTTP API pricing](https://aws.amazon.com/api-gateway/pricing/): approximately
  $0.01 for 10,000 calls at the first-tier $1/million rate before applicable benefits.
- [Lambda pricing](https://aws.amazon.com/lambda/pricing/): 5,000 GB-seconds and
  10,000 requests are small at on-demand ARM rates (roughly $0.07 compute before
  benefits). The published free allowance includes 1 million requests and
  400,000 GB-seconds, subject to account eligibility and aggregate use.
- [S3](https://aws.amazon.com/s3/pricing/) storage, PUT/GET operations and retained
  versions are usage-based. Origin transfers to CloudFront avoid ordinary internet
  transfer billing. Frequent releases and accumulated unused hashes add cost.
- [CloudWatch](https://aws.amazon.com/cloudwatch/pricing/) logs and alarms can
  exceed compute costs at low traffic. Three standard alarms are about $0.30/month
  before applicable free allowances; log ingestion/storage varies by region.
- [Secrets Manager](https://aws.amazon.com/secrets-manager/pricing/) adds roughly
  $0.40/secret/month plus API usage; this predictable charge avoids runtime SDK
  lookups and a new secret-loader bootstrap. Standard SSM parameters can be cheaper,
  but adopting them would require a separately tested secure runtime loading path.
- [Free Tier](https://aws.amazon.com/free/) benefits depend on account creation
  date and plan. New-account credits are temporary; do not assume the older
  service-specific 12-month benefits apply to every account. Recalculate in the
  selected region's pricing calculator before authorization.

Sustained bots, slow upstreams/cold starts, API bursts, exhausted shared Free Tier,
large responses/downloads, verbose logs and retained storage can exceed $5.
There are no enforceable CloudFront spend/traffic ceilings in this foundation.

## Manual AWS setup and deployment

Everything in this section is a future operator procedure. Do not run it as part
of offline repository preparation. Use MFA/SSO administrator sessions; no long-lived
AWS access keys belong in GitHub. Keep bootstrap and routine deployment separate.

1. Choose the account and region, review prices/quotas, configure billing alerts,
   and create the provider secret securely. Confirm TMDB/OMDb usage permissions.
2. Add or reuse the IAM OIDC provider `https://token.actions.githubusercontent.com`
   with audience `sts.amazonaws.com`. Do not create a duplicate provider.
3. Review and manually install `infrastructure/aws/bootstrap.cfn.json` as an
   administrator stack named `MovieExplorerBootstrapAccess` with
   `CAPABILITY_NAMED_IAM`. Set DeployRegion and CredentialsSecretName. Leave
   DistributionId as NOT_CONFIGURED for the initial installation. No credentials
   or account identifiers are stored in this template.
4. Use its ExecutionPolicyArn output with the installed CDK CLI:

   ```sh
   npm run cdk --workspace @movie-explorer/aws -- bootstrap aws://ACCOUNT/REGION --cloudformation-execution-policies EXECUTION_POLICY_ARN
   ```

   Replace placeholders locally. Do not accept the CDK default AdministratorAccess
   execution policy. This creates billable-capable bootstrap resources and must
   be separately authorized. Review bootstrap retention and lifecycle settings.
5. Run the local quality gates, then `npm run aws:package`, `npm run aws:test` and
   `npm run aws:synth`. Inspect `cdk.out/MovieExplorer.template.json` and the ZIP.
   Set AWS_REGION, AWS_CREDENTIALS_SECRET and AWS_ALARM_EMAIL for the intended
   account. After authorization, perform the first application deployment using
   the administrator session (the GitHub role cannot yet invalidate a distribution):

   ```sh
   npm run cdk --workspace @movie-explorer/aws -- deploy MovieExplorer --outputs-file .artifacts/outputs.json
   ```

6. Read the actual SiteUrl, BucketName and DistributionId outputs. Build the
   frontend with VITE_SITE_URL=SiteUrl and VITE_API_BASE_URL empty, upload hashed
   assets first and mutable files second using the workflow's exact upload commands,
   and invalidate `/index.html`, `/robots.txt`, `/sitemap.xml`. Never use public-read
   ACLs or `sync --delete` during release. Confirm the SNS email subscription.
7. Update the administrator access stack's DistributionId parameter with the real
   output, retaining all other parameter values. This scopes routine invalidation
   permission to the application distribution.
8. Configure GitHub environment `aws-production`: required reviewers, prevent
   self-review and deployment branches restricted to protected main. Protect the
   workflow and infrastructure with repository review rules. Confirm the repository
   plan supports environment protection; configure an equivalent external approval
   gate before enabling if it does not. The YAML alone cannot create that protection.
9. Set repository variable AWS_DEPLOY_ENABLED=true only after authorization and
   environment protection are complete. Dispatch Deploy AWS explicitly from main.

The OIDC trust subject is exactly
`repo:gaborcserto/movie-explorer:environment:aws-production`, with audience
`sts.amazonaws.com`, following [GitHub's AWS OIDC guidance](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws).
Environment subjects do not include a branch, so environment branch restrictions
and workflow main checks are both required. Pull requests never trigger deployment.

### IAM review boundaries

The routine GitHub role can assume only this region/account's CDK deploy and file
publishing roles, read this stack/bootstrap version, upload/read the frontend bucket,
and invalidate the one configured distribution. It cannot read provider secrets,
change IAM or bootstrap the account directly. The separate CloudFormation execution
policy creates the application resources. IAM creation/pass-role is limited to the
named runtime role with a log-only permission boundary; that policy cannot remove
the boundary or alter its managed policy.

Some infrastructure creation cannot be scoped to a resource ID that does not yet
exist. CloudFront create actions require `*`; its subsequent operations and
regional HTTP API operations use service-resource patterns. CloudWatch Logs
delivery setup and group discovery require explicit control-plane actions on
`*`, restricted to DeployRegion. Review these exceptions and use a dedicated
portfolio account if other workloads exist. The administrator policies are
source-reviewed templates, not a claim of live IAM authorization testing. Do not
silently expand them to AdministratorAccess if an AWS authorization check fails.

### GitHub variables and secrets

| Variable | Value |
| --- | --- |
| AWS_DEPLOY_ENABLED | Absent/false by default; true only after authorization |
| AWS_DEPLOY_ROLE_ARN | DeploymentRoleArn output from administrator access stack |
| AWS_REGION | Default eu-central-1 |
| AWS_CREDENTIALS_SECRET | Existing secret name, default movie-explorer/provider-credentials |
| AWS_ALARM_EMAIL | Required by workflow; confirm the SNS subscription |
| AWS_SITE_DOMAIN | Optional future hostname, paired with certificate ARN |
| AWS_CERTIFICATE_ARN | Existing validated ACM certificate in us-east-1 |

No GitHub credential secrets are required. TMDB/OMDb values stay in AWS Secrets
Manager. AWS account/role identifiers are operator configuration, never committed.
The workflow obtains short-lived OIDC credentials only after offline build and
package checks. Required quality gates run in a separate job with no OIDC permission.

### Subsequent deployments, rollback and cleanup

Dispatch Deploy AWS from main. It reruns application gates, audit, package tests
and synthesis before protected-environment deployment. CloudFormation changes the
backend, the frontend rebuild uses the actual public origin, hashed assets upload
before HTML, mutable files revalidate, and health is checked with retries. A failure
is visible in the job summary/logs; deployments are serialized and never canceled
mid-update. Existing CI and CodeQL gates remain intact.

The workflow retains the ZIP, cloud assembly, outputs and exact web build for 30
days. Preserve the previous successful artifact before an update. For rollback,
use an authorized operator session to deploy the previous cloud assembly with
`cdk --app PATH_TO_SAVED_CDK_OUT deploy MovieExplorer` (through the installed CDK
workspace command). Restore the corresponding web artifact, uploading hashes
before mutable files, then invalidate the three document paths and smoke-test.
If assets expired, the saved cloud assembly/ZIP must be re-published from the
artifact. Do not mix a previous HTML document with a different release's hashes.
CloudFormation automatically rolls back failed infrastructure updates; it cannot
undo a partially completed S3 upload. A missing 30-day artifact requires rebuilding
the known revision in a separate checkout and reviewing changes; never rewrite
repository history for rollback.

After deployment, check `/api/health`, direct movie/series/person/season/episode
links, search/autocomplete, filtering, history, library controls, galleries,
recovery, headers, real static errors, API JSON errors, robots and sitemap. Verify
cache headers and raw HTML social metadata at the final HTTPS origin. Confirm
alert delivery and provider quotas. Local synthesis cannot verify any of these
live service behaviors.

For removal, disable workflow authorization, review retained artifacts, and run
an explicitly authorized `cdk destroy MovieExplorer`. The retained private bucket
and logs, provider secret, access stack and CDKToolkit resources remain. Empty and
remove storage only after rollback/data-retention requirements end; remove access
roles and OIDC provider only if not shared. Check billing for retained resources.

For a future domain, obtain and validate an ACM certificate in us-east-1 manually,
configure AWS_SITE_DOMAIN/AWS_CERTIFICATE_ARN together, redeploy and point DNS to
CloudFront. No Route 53 hosted zone, purchased domain or certificate is created by
this code. Rebuild with the canonical HTTPS origin; decide apex/www redirects and
validate robots/canonicals/sitemap at that origin. CloudFront's default hostname
requires no domain purchase.

## Dependency security status

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
