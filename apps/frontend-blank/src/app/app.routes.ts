import { Route, Routes } from '@angular/router';
import { authGuard } from '@simply-direct/ngx-core';
import { HomePageComponent } from './pages/home.page';
import { DashboardPageComponent } from './pages/dashboard.page';

export const routes: Routes = [
    { path: '', component: HomePageComponent },
    { path: 'dashboard', component: DashboardPageComponent, canActivate: [authGuard()] },
    { path: '**', redirectTo: '' }
  ];