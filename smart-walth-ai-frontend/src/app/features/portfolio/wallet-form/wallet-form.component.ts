import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { CreateWalletRequest, WalletType } from '../../../core/models/wallet.model';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

const CURRENCIES = ['USD', 'EUR', 'MAD', 'GBP'] as const;
const TYPES: readonly WalletType[] = ['STOCKS', 'SAVINGS', 'CRYPTO'];

/** Blueprint F2.1 — create a wallet by type. */
@Component({
  selector: 'app-wallet-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslatePipe, ModalComponent, FormFieldComponent],
  templateUrl: './wallet-form.component.html',
})
export class WalletFormComponent {
  private readonly fb = inject(FormBuilder);

  readonly errorKey = input<string>('');

  readonly save = output<CreateWalletRequest>();
  readonly cancel = output<void>();

  readonly types = TYPES;
  readonly currencies = CURRENCIES;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    type: ['STOCKS' as WalletType, Validators.required],
    currency: ['USD', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.save.emit(this.form.getRawValue());
  }
}
