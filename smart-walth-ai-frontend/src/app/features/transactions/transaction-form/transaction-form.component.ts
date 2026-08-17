import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../../core/services/language.service';
import { TransactionService } from '../../../core/services/transaction.service';
import { formatMoney, formatQuantity } from '../../../core/util/format.util';
import { TransactionDraft, TransactionType, Wallet } from '../../../models';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

const TYPES: readonly TransactionType[] = ['DEPOSIT', 'WITHDRAW', 'BUY', 'SELL'];

/** Blueprint F3.1 / F3.2 — composes a deposit, withdrawal or asset trade. */
@Component({
  selector: 'app-transaction-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslatePipe, ModalComponent, FormFieldComponent],
  templateUrl: './transaction-form.component.html',
  styleUrl: './transaction-form.component.scss',
})
export class TransactionFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly transactions = inject(TransactionService);
  private readonly language = inject(LanguageService);

  readonly wallets = input.required<Wallet[]>();
  readonly errorKey = input<string>('');

  readonly save = output<TransactionDraft>();
  readonly cancel = output<void>();

  readonly types = TYPES;

  readonly form = this.fb.nonNullable.group({
    type: ['DEPOSIT' as TransactionType, Validators.required],
    walletId: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    assetSymbol: [''],
    assetName: [''],
    quantity: [0],
    unitPrice: [0],
    description: [''],
  });

  /** Mirrors the form so the template can react without a pipe on every field. */
  private readonly value = signal(this.form.getRawValue());

  readonly isTrade = computed(() => this.value().type === 'BUY' || this.value().type === 'SELL');

  readonly selectedWallet = computed(() =>
    this.wallets().find((wallet) => wallet.id === this.value().walletId),
  );

  /** Trade amount is always quantity × unit price, never typed directly. */
  readonly tradeAmount = computed(() => {
    const { quantity, unitPrice } = this.value();
    return round(quantity * unitPrice);
  });

  readonly availableCash = computed(() => this.selectedWallet()?.balance ?? 0);

  readonly availableQuantity = computed(() => {
    const { walletId, assetSymbol } = this.value();
    if (!walletId || !assetSymbol) return 0;
    return this.transactions.availableQuantity(walletId, assetSymbol);
  });

  constructor() {
    this.form.controls.type.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((type) => this.applyTypeRules(type));

    this.form.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.value.set(this.form.getRawValue()));

    // Inputs are only bound after construction, hence the effect.
    effect(() => {
      if (this.form.controls.walletId.value) return;
      const first = this.wallets()[0]?.id;
      if (first) this.form.controls.walletId.setValue(first);
    });

    this.applyTypeRules('DEPOSIT');
  }

  /** Adds or drops the trade-only validators as the type changes. */
  private applyTypeRules(type: TransactionType): void {
    const { assetSymbol, assetName, quantity, unitPrice, amount } = this.form.controls;
    const trade = type === 'BUY' || type === 'SELL';

    if (trade) {
      assetSymbol.setValidators([Validators.required, Validators.maxLength(20)]);
      quantity.setValidators([Validators.required, Validators.min(0.000001)]);
      unitPrice.setValidators([Validators.required, Validators.min(0.01)]);
      amount.disable({ emitEvent: false });
    } else {
      assetSymbol.clearValidators();
      quantity.clearValidators();
      unitPrice.clearValidators();
      amount.enable({ emitEvent: false });
      assetSymbol.setValue('', { emitEvent: false });
      assetName.setValue('', { emitEvent: false });
      quantity.setValue(0, { emitEvent: false });
      unitPrice.setValue(0, { emitEvent: false });
    }

    assetSymbol.updateValueAndValidity({ emitEvent: false });
    quantity.updateValueAndValidity({ emitEvent: false });
    unitPrice.updateValueAndValidity({ emitEvent: false });
    this.value.set(this.form.getRawValue());
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.save.emit(this.toDraft());
  }

  private toDraft(): TransactionDraft {
    const value = this.form.getRawValue();
    const trade = value.type === 'BUY' || value.type === 'SELL';

    return {
      walletId: value.walletId,
      type: value.type,
      amount: trade ? this.tradeAmount() : value.amount,
      assetSymbol: trade ? value.assetSymbol.trim().toUpperCase() : null,
      assetName: trade ? value.assetName.trim() || value.assetSymbol.trim().toUpperCase() : null,
      quantity: trade ? value.quantity : null,
      unitPrice: trade ? value.unitPrice : null,
      description: value.description.trim() || null,
    };
  }

  money(value: number): string {
    return formatMoney(value, this.language.locale, this.selectedWallet()?.currency ?? 'USD');
  }

  quantityLabel(value: number): string {
    return formatQuantity(value, this.language.locale);
  }
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
