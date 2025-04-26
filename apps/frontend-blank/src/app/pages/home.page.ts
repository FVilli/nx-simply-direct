import { Component, inject, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from "@angular/forms";
import { CoreService, CoreStore } from '@simply-direct/ngx-core';

@Component({
  selector: 'app-home-page',
  imports: [CommonModule,FormsModule],
  template:`
  <div class="min-h-screen flex flex-col items-center justify-center bg-gray-100">

  <div class="w-full max-w-md bg-white rounded-lg shadow-md p-8">
    @if(!store.loggedIn()) {
    <form class="space-y-4" #loginForm="ngForm" (ngSubmit)="login()">
      <div>
        <label for="name">Name</label>
        <input type="text" class="mt-1 w-full px-4 py-2 rounded-lg border border-gray-300" required id="name" name="name" [(ngModel)]="model.name" />
      </div>
      <div>
        <label for="password">Password</label>
        <input type="password" class="mt-1 w-full px-4 py-2 rounded-lg border border-gray-300" required id="password" name="password" [(ngModel)]="model.password" />
      </div>
      <button type="submit" 
        class="w-full bg-primary text-white py-2 rounded-lg hover:bg-blue-600 transition-colors" 
        [ngClass]="{'bg-primary hover:bg-blue-600': loginForm.valid,'bg-gray-400 cursor-not-allowed': loginForm.invalid }" [disabled]="loginForm.invalid">
        Login
      </button>

      <p class="mt-4">socket connected: {{ store.connected() ? '✅':'❌' }}</p>

    </form>
    }
    @else {

      <p>user: <b>{{ store.auth()?.user?.name }}</b></p>
      
      <button type="button" (click)="logout()" class="mt-4 w-full bg-primary text-white py-2 rounded-lg hover:bg-blue-600 transition-colors">Logout</button>
      <!-- <pre> {{ store.auth() | json }} </pre> -->
      
    }
  
    
  </div>



  </div>
  `,
  encapsulation: ViewEncapsulation.None,
})
export class HomePageComponent {
  readonly store = inject(CoreStore);
  readonly service = inject(CoreService);
  model = { name:'', password:'' };
  async login() {
    await this.service.login(this.model.name,this.model.password);
    this.model.password = '';
  }

  async logout() {
    await this.service.logout();
  }
  
}
