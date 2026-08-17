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
import { Asset, AssetDraft, Wallet } from '../../../models';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

/** Blueprint F2.2 — add or edit a holding, including its average buy price. */
@Component({
  selector: 'app-asset-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslatePipe, ModalComponent, FormFieldComponent],
  templateUrl: './asset-form.component.html',
})
export class AssetFormComponent {
  private readonly fb = inject(FormBuilder);

  readonly wallets = input.required<Wallet[]>();
  /** Preselected wallet when adding from a wallet card. */
  readonly walletId = input<string>('');
  readonly asset = input<Asset | null>(null);
  readonly errorKey = input<string>('');

  readonly save = output<AssetDraft>();
  readonly cancel = output<void>();

  readonly form = this.fb.nonNullable.group({
    walletId: ['', Validators.required],
    symbol: ['', [Validators.required, Validators.maxLength(20)]],
    name: ['', [Validators.required, Validators.maxLength(100)]],
    quantity: [0, [Validators.required, Validators.min(0.000001)]],
    avgBuyPrice: [0, [Validators.required, Validators.min(0.01)]],
    currentPrice: [null as number | null],
  });

  readonly isEdit = computed(() => this.asset() !== null);

  constructor() {
    effect(() => {
      const existing = this.asset();
      if (existing) {
        this.form.setValue({
          walletId: existing.walletId,
          symbol: existing.symbol,
          name: existing.name,
          quantity: existing.quantity,
          avgBuyPrice: existing.avgBuyPrice,
          currentPrice: existing.currentPrice,
        });
        return;
      }

      const preselected = this.walletId() || this.wallets()[0]?.id;
      if (preselected) {
        this.form.controls.walletId.setValue(preselected);
      }
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.save.emit({
      ...value,
      currentPrice:
        value.currentPrice === null || Number.isNaN(value.currentPrice)
          ? null
          : Number(value.currentPrice),
    });
  }
}
