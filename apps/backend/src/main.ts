/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';
import { join } from 'path';
import { ENV } from './env';
import { ITdt } from '@simply-direct/common';

async function bootstrap() {
  const server = (<any>express)(); // TODO: rompeva il cazzo ...
  //const app = await NestFactory.create(AppModule);
  const app = await NestFactory.create<NestExpressApplication>(AppModule, new ExpressAdapter(server));

  // TODO: sistemare ...
  server.use(express.static(join(__dirname, '../../web-ui/browser')));
  server.use('/docs', express.static(join(__dirname, '../../docs')));
  server.get('*all', (req, res) => {
    res.sendFile(join(__dirname, '../../web-ui/browser', 'index.html'));
  });

  const UID = process.getuid();
  const GID = process.getgid();

  await app.listen(ENV.PORT, '0.0.0.0');

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const port = process.env.PORT || 3000;
  await app.listen(port);

  Logger.log(`🚀 Application is running on: http://localhost:${port}/${globalPrefix}`);

  console.log('-----------------------------------------------------------------');
  console.log(`${ITdt()} Node.js Version:`, process.version);
  console.log(`Application is running and listening on port:${ENV.PORT}`);
  console.log(`Process running as ${UID}:${GID} (UserID:${UID}, GroupID:${GID})`);
  console.log('-----------------------------------------------------------------');
}

bootstrap();
