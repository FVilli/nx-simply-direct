import { Component, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard-page',
  imports: [CommonModule],
  template: `<h1>Dashboard !</h1>`,
  encapsulation: ViewEncapsulation.None,
})
export class DashboardPageComponent {}
