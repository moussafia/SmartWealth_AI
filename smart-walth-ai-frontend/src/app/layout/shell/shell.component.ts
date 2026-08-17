import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../core/services/language.service';
import { NotificationFeedService } from '../../core/services/notification.service';
import { ThemeService } from '../../core/services/theme.service';
import { UserService } from '../../core/services/user.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { NotificationPanelComponent } from '../notification-panel/notification-panel.component';

interface NavItem {
  path: string;
  labelKey: string;
  icon: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: readonly NavItem[] = [
  { path: '/dashboard', labelKey: 'nav.dashboard', icon: '◧' },
  { path: '/portfolio', labelKey: 'nav.portfolio', icon: '◈' },
  { path: '/transactions', labelKey: 'nav.transactions', icon: '⇅' },
  { path: '/advisor', labelKey: 'nav.advisor', icon: '✦' },
  { path: '/profile', labelKey: 'nav.profile', icon: '◍' },
  { path: '/admin', labelKey: 'nav.admin', icon: '⚙', adminOnly: true },
];

@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    TranslatePipe,
    NotificationPanelComponent,
    IconComponent,
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  private readonly themeService = inject(ThemeService);
  private readonly languageService = inject(LanguageService);
  private readonly users = inject(UserService);
  readonly notifications = inject(NotificationFeedService);

  readonly user = this.users.me;
  readonly fullName = this.users.fullName;
  readonly initials = this.users.initials;
  readonly feed = this.notifications.all;
  readonly unreadCount = this.notifications.unreadCount;

  readonly isDark = this.themeService.isDark;
  readonly language = this.languageService.language;
  readonly panelOpen = signal(false);

  /** Blueprint F1.3 — the monitoring entry only exists for the ADMIN role. */
  readonly navItems = computed(() =>
    NAV_ITEMS.filter((item) => !item.adminOnly || this.users.isAdmin()),
  );

  toggleTheme(): void {
    this.themeService.toggle();
  }

  toggleLanguage(): void {
    this.languageService.toggle();
  }

  togglePanel(): void {
    this.panelOpen.update((open) => !open);
  }

  closePanel(): void {
    this.panelOpen.set(false);
  }
}
