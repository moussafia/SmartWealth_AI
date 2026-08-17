import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { Wallet, WalletDraft, WalletType } from '../../../models';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

const CURRENCIES = ['USD', 'EUR', 'MAD', 'GBP'] as const;
const TYPES: readonly WalletType[] = ['STOCKS', 'SAVINGS', 'CRYPTO'];

/** Blueprint F2.1 — create a wallet by type, or edit an existing one. */
@Component({
  selector: 'app-wallet-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslatePipe, ModalComponent, FormFieldComponent],
  templateUrl: './wallet-form.component.html',
})
export class WalletFormComponent {
  private readonly fb = inject(FormBuilder);

  /** Present when editing; the form is prefilled from it. */
  readonly wallet = input<Wallet | null>(null);
  readonly errorKey = input<string>('');

  readonly save = output<WalletDraft>();
  readonly cancel = output<void>();

  readonly types = TYPES;
  readonly currencies = CURRENCIES;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    type: ['STOCKS' as WalletType, Validators.required],
    balance: [0, [Validators.required, Validators.min(0)]],
    currency: ['USD', Validators.required],
  });

  readonly isEdit = computed(() => this.wallet() !== null);

  constructor() {
    // Inputs are only bound after construction, so prefilling happens here.
    effect(() => {
      const existing = this.wallet();
      if (!existing) return;
      this.form.setValue({
        name: existing.name,
        type: existing.type,
        balance: existing.balance,
        currency: existing.currency,
      });
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.save.emit(this.form.getRawValue());
  }
}
