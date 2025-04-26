import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';
import { join } from 'path';
import { ENV } from './env';
import { ITdt } from '@simply-direct/common';

async function bootstrap() {
  const server = express.default();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, new ExpressAdapter(server));

  const frontend_folder = join(__dirname, '../frontend-blank/browser');
  server.use(express.static(frontend_folder));
  server.get('*all', (req, res) => {
    res.sendFile(join(__dirname, frontend_folder, 'index.html'));
  });

  const UID = process.getuid();
  const GID = process.getgid();

  await app.listen(ENV.PORT, '0.0.0.0');

  console.log('-----------------------------------------------------------');
  console.log(`${ITdt()} 💻 Node.js Version:${process.version}`);
  console.log(`🚀 Application is running and listening on port:${ENV.PORT}`);
  console.log(`🔬 Process running as ${UID}:${GID} (UserID:${UID}, GroupID:${GID})`);
  console.log('-----------------------------------------------------------');
}

bootstrap();
