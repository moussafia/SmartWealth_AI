import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { ShellComponent } from './layout/shell/shell.component';
import {authGuard} from './core/guards/auth-guard';

/**
 * Route list derived from the blueprint's feature scope: F1 (login, profile),
 * F2 (portfolio), F3 (transactions), F4 + F5.4 (AI advisor), F5.1–F5.3
 * (dashboard) and F5.5 (admin monitoring).
 */
export const routes: Routes = [
  {
    path: 'login',
    title: 'SmartWealth AI — Connexion',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'SmartWealth AI — Tableau de bord',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'portfolio',
        title: 'SmartWealth AI — Portefeuille',
        loadComponent: () =>
          import('./features/portfolio/portfolio.component').then((m) => m.PortfolioComponent),
      },
      {
        path: 'transactions',
        title: 'SmartWealth AI — Transactions',
        loadComponent: () =>
          import('./features/transactions/transactions.component').then(
            (m) => m.TransactionsComponent,
          ),
      },
      {
        path: 'advisor',
        title: 'SmartWealth AI — Conseiller IA',
        loadComponent: () =>
          import('./features/advisor/advisor.component').then((m) => m.AdvisorComponent),
      },
      {
        path: 'profile',
        title: 'SmartWealth AI — Profil',
        loadComponent: () =>
          import('./features/profile/profile.component').then((m) => m.ProfileComponent),
      },
      {
        path: 'admin',
        title: 'SmartWealth AI — Administration',
        canMatch: [adminGuard],
        loadComponent: () =>
          import('./features/admin/admin.component').then((m) => m.AdminComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
