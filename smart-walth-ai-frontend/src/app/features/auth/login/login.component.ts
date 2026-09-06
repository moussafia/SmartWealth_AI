import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { switchMap } from 'rxjs';
import { LanguageService } from '../../../core/services/language.service';
import { ThemeService } from '../../../core/services/theme.service';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { StatusChipComponent } from '../../../shared/components/status-chip/status-chip.component';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirm');
  if (!confirm || confirm.disabled) return null;
  return password === confirm.value ? null : { mismatch: true };
}

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
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly user = this.users.me;
  readonly isDark = this.themeService.isDark;
  readonly language = this.languageService.language;

  readonly registering = signal(false);
  readonly submitError = signal('');
  readonly loading = signal(false);

  readonly form = this.fb.nonNullable.group(
    {
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.pattern(EMAIL_PATTERN)]],
      password: ['', [Validators.required]],
      confirm: [''],
    },
    { validators: passwordsMatch },
  );

  readonly passwordMismatch = computed(() => this.mismatch());
  private readonly mismatch = signal(false);

  constructor() {
    // Optional demo prefill — remove this effect if you don't want fields pre-filled.
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

  private applyMode(registering: boolean): void {
    const { firstName, lastName, confirm } = this.form.controls;

    for (const control of [firstName, lastName, confirm]) {
      if (registering) control.enable({ emitEvent: false });
      else control.disable({ emitEvent: false });
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

    this.submitError.set('');
    this.loading.set(true);

    const { firstName, lastName, email, password } = this.form.getRawValue();

    // Register: create account, then log in with the same credentials.
    // Login: log in directly.
    const start$ = this.registering()
      ? this.auth
        .register({ firstName, lastName, email, password })
        .pipe(switchMap(() => this.auth.login({ username: email, password })))
      : this.auth.login({ username: email, password });

    // Both paths finish by loading the authoritative profile from /users/me.
    start$
      .pipe(
        switchMap(() => this.auth.me()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (profile) => {
          this.loading.set(false);
          this.users.updateProfile({
            firstName: profile.firstName,
            lastName: profile.lastName,
            email: profile.email,
          });
          void this.router.navigate(['/dashboard']);
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          this.submitError.set(this.errorKey(err));
        },
      });
  }

  private errorKey(err: HttpErrorResponse): string {
    if (err.status === 401) return 'login.invalidCredentials'; // bad login
    if (err.status === 409) return 'login.emailTaken';         // register conflict
    if (err.status === 0) return 'error.network';              // gateway down / CORS
    return 'error.generic';
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  toggleLanguage(): void {
    this.languageService.toggle();
  }
}
