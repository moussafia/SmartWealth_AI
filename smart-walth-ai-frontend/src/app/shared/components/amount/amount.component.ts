import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { LanguageService } from '../../../core/services/language.service';
import { formatMoney, formatSignedMoney } from '../../../core/util/format.util';

/**
 * Monospaced money value. `signed` colours the number and prefixes +/- so
 * gain/loss is never communicated by colour alone (rules §5).
 */
@Component({
  selector: 'app-amount',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="amount" [class.positive]="isPositive()" [class.negative]="isNegative()">{{
    text()
  }}</span>`,
  styleUrl: './amount.component.scss',
})
export class AmountComponent {
  private readonly language = inject(LanguageService);

  readonly value = input.required<number>();
  readonly currency = input<string>('USD');
  readonly signed = input<boolean>(false);
  readonly digits = input<string>('1.2-2');

  readonly isPositive = computed(() => this.signed() && this.value() > 0);
  readonly isNegative = computed(() => this.signed() && this.value() < 0);

  readonly text = computed(() => {
    const locale = this.language.locale;
    return this.signed()
      ? formatSignedMoney(this.value(), locale, this.currency(), this.digits())
      : formatMoney(this.value(), locale, this.currency(), this.digits());
  });
}
