import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * Label + control + validation message, so every form in the app reports errors
 * the same way. The control is passed in rather than wrapped, which keeps the
 * projected input a plain `formControlName` binding.
 */
@Component({
  selector: 'app-form-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `
    <div class="field" [class.field--invalid]="showError()">
      <label [attr.for]="for()">
        {{ label() }}
        @if (optional()) {
          <span class="field__optional">{{ 'common.optional' | translate }}</span>
        }
      </label>

      <ng-content />

      @if (showError()) {
        <p class="field__error" role="alert">
          {{ errorKey() | translate: errorParams() }}
        </p>
      } @else if (hint()) {
        <p class="field__hint">{{ hint() }}</p>
      }
    </div>
  `,
  styleUrl: './form-field.component.scss',
})
export class FormFieldComponent {
  readonly label = input.required<string>();
  readonly for = input.required<string>();
  readonly control = input.required<AbstractControl>();
  readonly hint = input<string>('');
  readonly optional = input<boolean>(false);

  /** Bumped whenever the control reports a value, status or touched change. */
  private readonly revision = signal(0);

  constructor() {
    effect((onCleanup) => {
      const subscription = this.control().events.subscribe(() =>
        this.revision.update((value) => value + 1),
      );
      onCleanup(() => subscription.unsubscribe());
    });
  }

  readonly showError = computed(() => {
    this.revision();
    const control = this.control();
    return control.invalid && (control.touched || control.dirty);
  });

  readonly errorKey = computed(() => {
    this.revision();
    const errors = this.control().errors ?? {};

    if (errors['required']) return 'validation.required';
    if (errors['email']) return 'validation.email';
    if (errors['min']) return 'validation.min';
    if (errors['max']) return 'validation.max';
    if (errors['minlength']) return 'validation.minLength';
    if (errors['maxlength']) return 'validation.maxLength';
    if (errors['pattern']) return 'validation.pattern';
    return 'validation.invalid';
  });

  readonly errorParams = computed<Record<string, unknown>>(() => {
    this.revision();
    const errors = this.control().errors ?? {};

    if (errors['min']) return { value: errors['min'].min };
    if (errors['max']) return { value: errors['max'].max };
    if (errors['minlength']) return { value: errors['minlength'].requiredLength };
    if (errors['maxlength']) return { value: errors['maxlength'].requiredLength };
    return {};
  });
}
