import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { AddAssetFormValue, WalletDto } from '../../../core/models/wallet.model';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

/** Blueprint F2.2 — add a holding. The backend fetches its live price. */
@Component({
  selector: 'app-asset-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslatePipe, ModalComponent, FormFieldComponent],
  templateUrl: './asset-form.component.html',
})
export class AssetFormComponent {
  private readonly fb = inject(FormBuilder);

  readonly wallets = input.required<WalletDto[]>();
  /** Preselected wallet when adding from a wallet card. */
  readonly walletId = input<string>('');
  readonly errorKey = input<string>('');

  readonly save = output<AddAssetFormValue>();
  readonly cancel = output<void>();

  readonly form = this.fb.nonNullable.group({
    walletId: ['', Validators.required],
    symbol: ['', [Validators.required, Validators.maxLength(20)]],
    name: ['', [Validators.required, Validators.maxLength(100)]],
    quantity: [0, [Validators.required, Validators.min(0.000001)]],
    avgBuyPrice: [0, [Validators.required, Validators.min(0.01)]],
  });

  constructor() {
    // Preselect a wallet when the form opens.
    effect(() => {
      const preselected = this.walletId() || this.wallets()[0]?.id;
      if (preselected) {
        this.form.controls.walletId.setValue(preselected, { emitEvent: false });
      }
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.save.emit({
      walletId: v.walletId,
      symbol: v.symbol,
      name: v.name,
      quantity: v.quantity,
      buyPrice: v.avgBuyPrice,   // API expects `buyPrice`
    });
  }
}
