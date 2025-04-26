import { Component, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-splash',
  imports: [CommonModule],
  template: `
  <div class="flex justify-center items-center h-screen">
    <p class="text-9xl font-medium text-black">Splash!</p>
  </div>
  `,
  encapsulation: ViewEncapsulation.None,
})
export class SplashComponent {}