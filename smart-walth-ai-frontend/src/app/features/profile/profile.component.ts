import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../core/services/language.service';
import { PortfolioService } from '../../core/services/portfolio.service';
import { ThemeService } from '../../core/services/theme.service';
import { UserService } from '../../core/services/user.service';
import { formatDateTime } from '../../core/util/format.util';
import { AmountComponent } from '../../shared/components/amount/amount.component';
import { CardComponent } from '../../shared/components/card/card.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import { FormFieldComponent } from '../../shared/components/form-field/form-field.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';
import { kycStatusTone } from '../../shared/util/tone.util';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Blueprint F1.2 / F1.3: profile editing, KYC submission and the active role. */
@Component({
  selector: 'app-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    PageHeaderComponent,
    CardComponent,
    DataTableComponent,
    AmountComponent,
    StatusChipComponent,
    IconComponent,
    FormFieldComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent {
  private readonly fb = inject(FormBuilder);
  private readonly themeService = inject(ThemeService);
  private readonly languageService = inject(LanguageService);
  private readonly users = inject(UserService);
  private readonly portfolio = inject(PortfolioService);

  readonly user = this.users.me;
  readonly initials = this.users.initials;
  readonly wallets = this.portfolio.wallets;

  readonly isDark = this.themeService.isDark;
  readonly language = this.languageService.language;
  readonly kycStatusTone = kycStatusTone;

  readonly editing = signal(false);
  readonly formError = signal('');
  readonly confirmKyc = signal(false);

  readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.pattern(EMAIL_PATTERN)]],
  });

  constructor() {
    // Keeps the form in step with the stored profile whenever it changes.
    effect(() => {
      const user = this.user();
      if (!user) return;
      this.form.setValue({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      });
    });
  }

  startEdit(): void {
    this.formError.set('');
    this.editing.set(true);
  }

  cancelEdit(): void {
    const user = this.user();
    if (user) {
      this.form.setValue({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      });
    }
    this.formError.set('');
    this.editing.set(false);
  }

  /** PUT /api/users/me equivalent. */
  saveProfile(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const result = this.users.updateProfile(this.form.getRawValue());
    if (result.ok) {
      this.editing.set(false);
      this.formError.set('');
      return;
    }
    this.formError.set(result.errorKey ?? 'error.generic');
  }

  requestKyc(): void {
    this.confirmKyc.set(true);
  }

  submitKyc(): void {
    this.users.submitKyc();
    this.confirmKyc.set(false);
  }

  resetKyc(): void {
    this.users.resetKyc();
  }

  /** Blueprint F1.3 — switching role re-evaluates the admin route guard. */
  toggleRole(): void {
    this.users.toggleRole();
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  toggleLanguage(): void {
    this.languageService.toggle();
  }

  when(value: string): string {
    return formatDateTime(value, this.languageService.locale);
  }
}
