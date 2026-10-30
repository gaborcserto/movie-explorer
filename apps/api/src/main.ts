import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

import { AppModule } from './app.module';
import { configureHttp } from './configure-http';
import { getServerConfig } from './configuration/server.config';

async function bootstrap() {
  const config = getServerConfig();
  const app = await NestFactory.create(AppModule);
  configureHttp(app, config);
  const { port, host } = config;

  if (host !== undefined) {
    await app.listen(port, host);
  } else {
    await app.listen(port);
  }

  const serverUrl = new URL(await app.getUrl());
  const boundHostname = serverUrl.hostname.replace(/^\[|\]$/gu, '');
  const isLoopbackAddress =
    boundHostname === '::1' ||
    (isIP(boundHostname) === 4 && boundHostname.startsWith('127.'));

  if (!host && isLoopbackAddress) {
    const localhostAddresses = await lookup('localhost', { all: true }).catch(
      () => [],
    );

    if (localhostAddresses.some(({ address }) => address === boundHostname)) {
      serverUrl.hostname = 'localhost';
    }
  }

  const logger = new Logger('Bootstrap');
  logger.log(`API: ${serverUrl.origin}`);

  if (config.swaggerEnabled) {
    logger.log(`Swagger UI: ${serverUrl.origin}/api-docs`);
  }
}
void bootstrap();
