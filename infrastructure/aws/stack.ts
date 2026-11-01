import {
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  StackProps,
  Tags,
  aws_apigateway as gateway,
  aws_apigatewayv2 as apigateway,
  aws_apigatewayv2_integrations as integrations,
  aws_certificatemanager as acm,
  aws_cloudfront as cloudfront,
  aws_cloudfront_origins as origins,
  aws_cloudwatch as cloudwatch,
  aws_cloudwatch_actions as actions,
  aws_iam as iam,
  aws_lambda as lambda,
  aws_logs as logs,
  aws_s3 as s3,
  aws_secretsmanager as secretsmanager,
  aws_sns as sns,
  aws_sns_subscriptions as subscriptions,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { resolve } from 'node:path';

export interface MovieExplorerStackProps extends StackProps {
  alias?: string;
  certificateArn?: string;
  credentialsSecretName: string;
  alarmEmail?: string;
  releaseId?: string;
  lambdaCode?: lambda.Code;
}

export class MovieExplorerStack extends Stack {
  constructor(scope: Construct, id: string, props: MovieExplorerStackProps) {
    super(scope, id, props);

    if (Boolean(props.alias) !== Boolean(props.certificateArn)) {
      throw new Error(
        'AWS_SITE_DOMAIN and AWS_CERTIFICATE_ARN must be configured together',
      );
    }
    if (
      props.alias &&
      !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/i.test(props.alias)
    ) {
      throw new Error('AWS_SITE_DOMAIN must be a DNS hostname');
    }
    if (
      props.certificateArn &&
      !/^arn:aws:acm:us-east-1:\d{12}:certificate\/[a-f0-9-]+$/.test(
        props.certificateArn,
      )
    ) {
      throw new Error(
        'CloudFront requires an ACM certificate ARN in us-east-1',
      );
    }

    Tags.of(this).add('Application', 'movie-explorer');
    Tags.of(this).add('Environment', 'production');

    const bucket = new s3.Bucket(this, 'Frontend', {
      bucketName: `movie-explorer-frontend-${this.account}-${this.region}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      enforceSSL: true,
      versioned: true,
      removalPolicy: RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          noncurrentVersionExpiration: Duration.days(30),
          abortIncompleteMultipartUploadAfter: Duration.days(1),
        },
      ],
    });
    const apiLogs = new logs.LogGroup(this, 'ApiLogs', {
      logGroupName: '/movie-explorer/http-api',
      retention: logs.RetentionDays.TWO_WEEKS,
      removalPolicy: RemovalPolicy.RETAIN,
    });
    const functionLogs = new logs.LogGroup(this, 'FunctionLogs', {
      logGroupName: '/aws/lambda/movie-explorer-api',
      retention: logs.RetentionDays.TWO_WEEKS,
      removalPolicy: RemovalPolicy.RETAIN,
    });
    const role = new iam.Role(this, 'ApiRole', {
      roleName: 'movie-explorer-api-runtime',
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      permissionsBoundary: iam.ManagedPolicy.fromManagedPolicyName(
        this,
        'RuntimeBoundary',
        'movie-explorer-runtime-boundary',
      ),
    });
    functionLogs.grantWrite(role);

    const credentials = secretsmanager.Secret.fromSecretNameV2(
      this,
      'Credentials',
      props.credentialsSecretName,
    );
    const backend = new lambda.Function(this, 'Backend', {
      functionName: 'movie-explorer-api',
      runtime: lambda.Runtime.NODEJS_24_X,
      architecture: lambda.Architecture.ARM_64,
      handler: 'run.sh',
      code:
        props.lambdaCode ??
        lambda.Code.fromAsset(resolve(__dirname, '../.artifacts/backend.zip')),
      role,
      memorySize: 512,
      timeout: Duration.seconds(28),
      reservedConcurrentExecutions: 5,
      logGroup: functionLogs,
      layers: [
        lambda.LayerVersion.fromLayerVersionArn(
          this,
          'WebAdapter',
          `arn:aws:lambda:${this.region}:753240598075:layer:LambdaAdapterLayerArm64:30`,
        ),
      ],
      environment: {
        RELEASE_ID: props.releaseId ?? 'local',
        NO_COLOR: '1',
        NODE_ENV: 'production',
        PORT: '8080',
        HOST: '0.0.0.0',
        SWAGGER_ENABLED: 'false',
        CORS_ORIGINS: '',
        AWS_LAMBDA_EXEC_WRAPPER: '/opt/bootstrap',
        AWS_LWA_PORT: '8080',
        AWS_LWA_READINESS_CHECK_PATH: '/health',
        AWS_LWA_READINESS_CHECK_HEALTHY_STATUS: '200',
        AWS_LWA_ASYNC_INIT: 'true',
        // Resolved by CloudFormation; never put plaintext in context or artifacts.
        TMDB_ACCESS_TOKEN: credentials
          .secretValueFromJson('TMDB_ACCESS_TOKEN')
          .unsafeUnwrap(),
        OMDB_API_KEY: credentials
          .secretValueFromJson('OMDB_API_KEY')
          .unsafeUnwrap(),
      },
    });

    const api = new apigateway.HttpApi(this, 'Api', {
      createDefaultStage: false,
    });
    api.addRoutes({
      path: '/api/{proxy+}',
      methods: [apigateway.HttpMethod.ANY],
      integration: new integrations.HttpLambdaIntegration('Nest', backend),
    });
    const stage = new apigateway.HttpStage(this, 'ApiStage', {
      httpApi: api,
      stageName: '$default',
      autoDeploy: true,
      throttle: { rateLimit: 5, burstLimit: 10 },
      accessLogSettings: {
        destination: new apigateway.LogGroupLogDestination(apiLogs),
        format: gateway.AccessLogFormat.custom(
          JSON.stringify({
            requestId: '$context.requestId',
            status: '$context.status',
            latency: '$context.responseLatency',
            integrationStatus: '$context.integrationStatus',
          }),
        ),
      },
    });

    const headers = new cloudfront.ResponseHeadersPolicy(
      this,
      'SecurityHeaders',
      {
        securityHeadersBehavior: {
          strictTransportSecurity: {
            accessControlMaxAge: Duration.days(365),
            override: true,
          },
          contentTypeOptions: { override: true },
          frameOptions: {
            frameOption: cloudfront.HeadersFrameOption.DENY,
            override: true,
          },
          referrerPolicy: {
            referrerPolicy:
              cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
            override: true,
          },
        },
      },
    );
    const spa = new cloudfront.Function(this, 'SpaRouting', {
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      code: cloudfront.FunctionCode.fromFile({
        filePath: resolve(__dirname, '../edge/spa-request.js'),
      }),
    });
    const seo = new cloudfront.Function(this, 'SeoHeaders', {
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      code: cloudfront.FunctionCode.fromFile({
        filePath: resolve(__dirname, '../edge/seo-response.js'),
      }),
    });
    const frontendOrigin =
      origins.S3BucketOrigin.withOriginAccessControl(bucket);
    const apiBehavior: cloudfront.BehaviorOptions = {
      origin: new origins.HttpOrigin(
        `${api.apiId}.execute-api.${this.region}.${this.urlSuffix}`,
        { protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY },
      ),
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
      originRequestPolicy:
        cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      responseHeadersPolicy: headers,
    };
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      comment: 'Movie Explorer pay-as-you-go',
      errorResponses: [
        400, 403, 404, 405, 414, 416, 500, 501, 502, 503, 504,
      ].map((httpStatus) => ({ httpStatus, ttl: Duration.seconds(0) })),
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      minimumProtocolVersion: props.certificateArn
        ? cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021
        : undefined,
      domainNames: props.alias ? [props.alias] : undefined,
      certificate: props.certificateArn
        ? acm.Certificate.fromCertificateArn(
            this,
            'Certificate',
            props.certificateArn,
          )
        : undefined,
      defaultBehavior: {
        origin: frontendOrigin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        responseHeadersPolicy: headers,
        functionAssociations: [
          {
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
            function: spa,
          },
          {
            eventType: cloudfront.FunctionEventType.VIEWER_RESPONSE,
            function: seo,
          },
        ],
      },
      additionalBehaviors: {
        '/assets/*': {
          origin: frontendOrigin,
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          responseHeadersPolicy: headers,
        },
        '/api/*': apiBehavior,
        '/api': apiBehavior,
      },
    });

    const topic = new sns.Topic(this, 'Alerts');

    if (props.alarmEmail) {
      topic.addSubscription(
        new subscriptions.EmailSubscription(props.alarmEmail),
      );
    }

    const metrics = [
      backend.metricErrors(),
      backend.metricThrottles(),
      api.metricServerError({ statistic: 'Sum', period: Duration.minutes(5) }),
    ];

    for (const [index, metric] of metrics.entries()) {
      const alarm = new cloudwatch.Alarm(this, `FailureAlarm${index}`, {
        metric,
        threshold: 5,
        evaluationPeriods: 1,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      alarm.addAlarmAction(new actions.SnsAction(topic));
    }

    new CfnOutput(this, 'SiteUrl', {
      value: `https://${props.alias ?? distribution.distributionDomainName}`,
    });
    new CfnOutput(this, 'BucketName', { value: bucket.bucketName });
    new CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId,
    });
    new CfnOutput(this, 'ApiUrl', { value: stage.url });
    new CfnOutput(this, 'FunctionName', { value: backend.functionName });
    new CfnOutput(this, 'AlertTopicArn', { value: topic.topicArn });
  }
}
