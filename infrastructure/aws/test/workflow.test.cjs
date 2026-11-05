const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const YAML = require('yaml');

const root = path.resolve(__dirname, '../../..');
const workflowText = fs.readFileSync(
  path.join(root, '.github/workflows/deploy-aws.yml'),
  'utf8',
);
const workflow = YAML.parse(workflowText);
const bootstrap = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../bootstrap.cfn.json')),
);

test('deployment is manual, main-only, disabled by default, and follows quality gates', () => {
  assert.deepEqual(Object.keys(workflow.on), ['workflow_dispatch']);
  assert.equal(workflow.permissions['id-token'], undefined);
  assert.match(workflow.jobs.quality.if, /refs\/heads\/main/);
  assert.match(workflow.jobs.deploy.if, /AWS_DEPLOY_ENABLED == 'true'/);
  assert.equal(workflow.jobs.deploy.needs, 'quality');
  assert.equal(workflow.jobs.deploy.environment.name, 'aws-production');
  assert.equal(workflow.jobs.deploy.permissions['id-token'], 'write');

  const quality = workflow.jobs.quality.steps
    .map((step) => step.run)
    .filter(Boolean);

  for (const command of [
    'npm audit --omit=dev',
    'npm run lint',
    'npm run typecheck',
    'npm test',
    'npm run coverage',
    'npm run build',
    'npm run test:e2e',
    'npm run aws:package',
    'npm run aws:test',
    'npm run aws:synth',
  ]) {
    assert.ok(quality.includes(command), command);
  }

  assert.equal(
    /aws-access-key-id|aws-secret-access-key/.test(workflowText),
    false,
  );

  const steps = workflow.jobs.deploy.steps;
  const artifacts = steps.find((step) =>
    step.uses?.startsWith('actions/upload-artifact@'),
  );

  assert.equal(artifacts.with['include-hidden-files'], true);
  assert.match(artifacts.with.path, /\.artifacts\/backend\.zip/);

  const authentication = steps.findIndex((step) =>
    step.uses?.startsWith('aws-actions/configure-aws-credentials@'),
  );

  assert.ok(
    authentication > steps.findIndex((step) => step.run === 'npm run aws:test'),
  );
  assert.ok(
    steps.findIndex((step) => step.name === 'Deploy infrastructure') >
      authentication,
  );
});

test('OIDC trust is restricted to this repository and protected deployment environment', () => {
  const trust =
    bootstrap.Resources.GithubRole.Properties.AssumeRolePolicyDocument
      .Statement;

  assert.equal(trust.length, 1);
  assert.deepEqual(trust[0].Condition.StringEquals, {
    'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
    'token.actions.githubusercontent.com:sub':
      'repo:gaborcserto/movie-explorer:environment:aws-production',
  });
  assert.equal(
    bootstrap.Resources.GithubRole.Properties.RoleName,
    'movie-explorer-github-deploy',
  );
  assert.equal(
    JSON.stringify(bootstrap).includes('AdministratorAccess'),
    false,
  );
});

test('runtime permission boundary permits only logs and deployment cannot remove it', () => {
  const boundary =
    bootstrap.Resources.RuntimeBoundary.Properties.PolicyDocument.Statement;

  assert.equal(boundary.length, 1);
  assert.ok(boundary[0].Action.every((action) => action.startsWith('logs:')));

  const execution =
    bootstrap.Resources.ExecutionPolicy.Properties.PolicyDocument.Statement;

  assert.equal(
    execution.some((statement) =>
      statement.Action.includes('iam:DeleteRolePermissionsBoundary'),
    ),
    false,
  );

  const createRole = execution.find((statement) =>
    statement.Action.includes('iam:CreateRole'),
  );

  assert.ok(createRole.Condition.StringEquals['iam:PermissionsBoundary']);

  const routine =
    bootstrap.Resources.GithubRole.Properties.Policies[0].PolicyDocument
      .Statement;

  assert.equal(
    routine.some((statement) =>
      statement.Action.some((action) => /^(iam|secretsmanager):/.test(action)),
    ),
    false,
  );
});
