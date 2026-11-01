const assert = require('node:assert/strict');
const { test } = require('node:test');
const { App, aws_lambda: lambda } = require('aws-cdk-lib');
const { Template, Match } = require('aws-cdk-lib/assertions');

const { MovieExplorerStack } = require('../dist/stack');

function stack(options = {}) {
  return new MovieExplorerStack(new App(), 'Test', {
    env: { region: 'eu-central-1' },
    credentialsSecretName: 'movie-explorer/provider-credentials',
    lambdaCode: lambda.Code.fromInline('offline-test-fixture'),
    ...options,
  });
}

test('defines private retained S3 with OAC and distribution-scoped access', () => {
  const template = Template.fromStack(stack());
  template.hasResource('AWS::S3::Bucket', {
    DeletionPolicy: 'Retain',
    Properties: {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
      VersioningConfiguration: { Status: 'Enabled' },
    },
  });
  template.resourceCountIs('AWS::CloudFront::OriginAccessControl', 1);
  template.hasResourceProperties('AWS::S3::BucketPolicy', {
    PolicyDocument: {
      Statement: Match.arrayWith([
        Match.objectLike({
          Principal: { Service: 'cloudfront.amazonaws.com' },
          Action: 's3:GetObject',
          Condition: { StringEquals: { 'AWS:SourceArn': Match.anyValue() } },
        }),
      ]),
    },
  });
});

test('bounds Lambda cost and injects secret references without runtime secret permissions', () => {
  const template = Template.fromStack(stack());
  template.hasResourceProperties('AWS::Lambda::Function', {
    Runtime: 'nodejs24.x',
    Architectures: ['arm64'],
    Handler: 'run.sh',
    MemorySize: 512,
    Timeout: 28,
    ReservedConcurrentExecutions: 5,
    Environment: {
      Variables: Match.objectLike({
        AWS_LAMBDA_EXEC_WRAPPER: '/opt/bootstrap',
        AWS_LWA_READINESS_CHECK_PATH: '/health',
        SWAGGER_ENABLED: 'false',
        TMDB_ACCESS_TOKEN: Match.objectLike({ 'Fn::Join': Match.anyValue() }),
      }),
    },
  });
  const json = JSON.stringify(template.toJSON());
  assert.ok(json.includes('{{resolve:secretsmanager:'));
  assert.ok(json.includes(':SecretString:TMDB_ACCESS_TOKEN::}}'));
  assert.equal(json.includes('AdministratorAccess'), false);
  assert.equal(json.includes('secretsmanager:GetSecretValue'), false);
  assert.equal(json.includes('VpcConfig'), false);
  assert.equal(json.includes('AWS::EC2::'), false);
  assert.equal(json.includes('AWS::ElasticLoadBalancing'), false);
  assert.equal(json.includes('AWS::RDS::'), false);
  template.resourceCountIs('AWS::Lambda::Function', 1);
});

test('keeps API errors and methods separate from SPA fallback with no API caching', () => {
  const template = Template.fromStack(stack());
  template.hasResourceProperties('AWS::CloudFront::Distribution', {
    DistributionConfig: {
      CustomErrorResponses: Match.arrayWith([
        { ErrorCode: 404, ErrorCachingMinTTL: 0 },
        { ErrorCode: 500, ErrorCachingMinTTL: 0 },
      ]),
      DefaultCacheBehavior: Match.objectLike({
        CachePolicyId: '4135ea2d-6df8-44a3-9df3-4b5a84be39ad',
        ViewerProtocolPolicy: 'redirect-to-https',
      }),
      CacheBehaviors: Match.arrayWith([
        Match.objectLike({
          PathPattern: '/api/*',
          ViewerProtocolPolicy: 'https-only',
          CachePolicyId: '4135ea2d-6df8-44a3-9df3-4b5a84be39ad',
          OriginRequestPolicyId: 'b689b0a8-53d0-40ab-baf2-68738e2966ac',
          AllowedMethods: [
            'GET',
            'HEAD',
            'OPTIONS',
            'PUT',
            'PATCH',
            'POST',
            'DELETE',
          ],
        }),
      ]),
    },
  });
  template.hasResourceProperties('AWS::ApiGatewayV2::Route', {
    RouteKey: 'ANY /api/{proxy+}',
  });
  template.hasResourceProperties('AWS::ApiGatewayV2::Stage', {
    DefaultRouteSettings: { ThrottlingBurstLimit: 10, ThrottlingRateLimit: 5 },
  });
});

test('defines bounded logs, three low-noise alarms and optional email actions', () => {
  const template = Template.fromStack(
    stack({ alarmEmail: 'operator@example.com' }),
  );
  template.resourceCountIs('AWS::Logs::LogGroup', 2);
  template.allResourcesProperties('AWS::Logs::LogGroup', {
    RetentionInDays: 14,
  });
  template.resourceCountIs('AWS::CloudWatch::Alarm', 3);
  template.allResourcesProperties('AWS::CloudWatch::Alarm', {
    TreatMissingData: 'notBreaching',
    AlarmActions: Match.anyValue(),
  });
  template.hasResourceProperties('AWS::SNS::Subscription', {
    Protocol: 'email',
    Endpoint: 'operator@example.com',
  });
});

test('requires a matching future alias and existing us-east-1 certificate', () => {
  assert.throws(
    () => stack({ alias: 'movies.example.com' }),
    /configured together/,
  );
  assert.throws(
    () =>
      stack({ alias: 'https://movies.example.com', certificateArn: 'invalid' }),
    /DNS hostname/,
  );
  assert.throws(
    () =>
      stack({
        alias: 'movies.example.com',
        certificateArn:
          'arn:aws:acm:eu-central-1:000000000000:certificate/1234',
      }),
    /us-east-1/,
  );
  const template = Template.fromStack(
    stack({
      alias: 'movies.example.com',
      certificateArn: 'arn:aws:acm:us-east-1:000000000000:certificate/1234',
    }),
  );
  template.resourceCountIs('AWS::CertificateManager::Certificate', 0);
  template.hasResourceProperties('AWS::CloudFront::Distribution', {
    DistributionConfig: { Aliases: ['movies.example.com'] },
  });
});
