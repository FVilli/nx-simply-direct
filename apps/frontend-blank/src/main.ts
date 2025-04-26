import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { ClientUID } from '@simply-direct/ngx-core'
import { ITdt } from '@simply-direct/common';

const cid = ClientUID();
console.log(`${ITdt()} 📝 Client UID: ${cid}`);

bootstrapApplication(AppComponent, appConfig).catch((err) =>
  console.error(err)
);
