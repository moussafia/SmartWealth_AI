import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../../core/services/language.service';
import { ThemeService } from '../../../core/services/theme.service';
import { UserService } from '../../../core/services/user.service';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { StatusChipComponent } from '../../../shared/components/status-chip/status-chip.component';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

/** Register and login both point at the same group; `confirm` only applies to register. */
function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirm');
  if (!confirm || confirm.disabled) return null;
  return password === confirm.value ? null : { mismatch: true };
}

/**
 * Blueprint F1.1 — login and registration.
 *
 * There is no auth server, so credentials are validated client-side only and a
 * successful submit simply enters the shell. Registering does rewrite the stored
 * profile, so the name entered here shows up across the app.
 */
@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    StatusChipComponent,
    IconComponent,
    FormFieldComponent,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly themeService = inject(ThemeService);
  private readonly languageService = inject(LanguageService);
  private readonly users = inject(UserService);

  readonly user = this.users.me;
  readonly isDark = this.themeService.isDark;
  readonly language = this.languageService.language;

  readonly registering = signal(false);
  readonly submitError = signal('');

  readonly form = this.fb.nonNullable.group(
    {
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.pattern(EMAIL_PATTERN)]],
      password: ['', [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)]],
      confirm: [''],
    },
    { validators: passwordsMatch },
  );

  readonly passwordMismatch = computed(() => this.mismatch());
  private readonly mismatch = signal(false);

  constructor() {
    // Prefills the demo identity so the form can be submitted as-is.
    effect(() => {
      const user = this.user();
      if (!user) return;
      this.form.patchValue(
        { firstName: user.firstName, lastName: user.lastName, email: user.email },
        { emitEvent: false },
      );
    });

    this.applyMode(false);
  }

  toggleMode(): void {
    const next = !this.registering();
    this.registering.set(next);
    this.submitError.set('');
    this.applyMode(next);
  }

  /** Registration needs the identity fields; login does not. */
  private applyMode(registering: boolean): void {
    const { firstName, lastName, confirm } = this.form.controls;

    for (const control of [firstName, lastName, confirm]) {
      if (registering) {
        control.enable({ emitEvent: false });
      } else {
        control.disable({ emitEvent: false });
      }
    }

    confirm.setValidators(registering ? [Validators.required] : []);
    confirm.updateValueAndValidity({ emitEvent: false });
    this.mismatch.set(false);
  }

  submit(): void {
    this.mismatch.set(this.form.errors?.['mismatch'] === true);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      if (this.mismatch()) this.submitError.set('validation.passwordMismatch');
      return;
    }

    if (this.registering()) {
      const { firstName, lastName, email } = this.form.getRawValue();
      const result = this.users.updateProfile({ firstName, lastName, email });
      if (!result.ok) {
        this.submitError.set(result.errorKey ?? 'error.generic');
        return;
      }
    }

    this.submitError.set('');
    void this.router.navigate(['/dashboard']);
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  toggleLanguage(): void {
    this.languageService.toggle();
  }
}
