import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SplashComponent } from './components/splash.component';
import { CoreService, CoreStore } from '@simply-direct/ngx-core';

@Component({
  imports: [SplashComponent, RouterModule],
  selector: 'app-root',
  templateUrl: './app.component.html',
})
export class AppComponent {

  readonly coreStore = inject(CoreStore);
  readonly coreService = inject(CoreService);
  constructor() {
    this.coreService.log(true);
  }
  
}
