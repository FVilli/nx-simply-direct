/* eslint-disable @typescript-eslint/no-unused-vars */
import { signalStore, withComputed } from "@ngrx/signals";
import { computed, effect, inject } from "@angular/core";
import { CoreService } from "./core.service";

export const CoreStore = signalStore(
  { providedIn: 'root' },
  withComputed( _ => {
    const service = inject(CoreService);
    return {
      connected: computed(() => { return service.$connected(); }),
      initialized: computed(() => { return service.$initialized(); }),
      auth: computed(() => { return service.$auth(); }),
      loggedIn: computed(() => { return !!service.$auth(); }),
      users: computed(() => { return service.$users(); })
    };
  }),
);