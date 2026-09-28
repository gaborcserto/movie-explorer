import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { SwaggerModule} from '@nestjs/swagger';
import * as fs from 'fs';
import * as yaml from 'yaml';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: 'http://localhost:3000',
  });

  const file = fs.readFileSync('swagger.yaml', 'utf8');
  const config = yaml.parse(file);

  app.useGlobalPipes(new ValidationPipe());

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(4000);
}
bootstrap().then();
