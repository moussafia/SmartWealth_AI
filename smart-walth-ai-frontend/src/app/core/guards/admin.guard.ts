import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AppStateService } from '../state/app-state.service';

/**
 * Blueprint F1.3 — role-based access control. Non-admins never reach the
 * monitoring dashboard, and the sidebar hides the entry for them too.
 */
export const adminGuard: CanMatchFn = () => {
  if (inject(AppStateService).isAdmin()) return true;
  return inject(Router).createUrlTree(['/dashboard']);
};
