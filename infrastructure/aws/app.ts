import { App } from 'aws-cdk-lib';

import { MovieExplorerStack } from './stack';

const app = new App();
const region = process.env.AWS_REGION || 'eu-central-1';

new MovieExplorerStack(app, 'MovieExplorer', {
  env: { region },
  alias: process.env.AWS_SITE_DOMAIN,
  certificateArn: process.env.AWS_CERTIFICATE_ARN,
  credentialsSecretName:
    process.env.AWS_CREDENTIALS_SECRET || 'movie-explorer/provider-credentials',
  alarmEmail: process.env.AWS_ALARM_EMAIL,
  releaseId: process.env.AWS_RELEASE_ID,
});
