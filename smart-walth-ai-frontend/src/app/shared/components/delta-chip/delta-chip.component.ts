import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { LanguageService } from '../../../core/services/language.service';
import { Direction, direction, formatSignedPercent } from '../../../core/util/format.util';
import { TrendArrowComponent } from '../trend-arrow/trend-arrow.component';

/** Pill showing a signed percentage change with its trend arrow. */
@Component({
  selector: 'app-delta-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TrendArrowComponent],
  template: `
    <span class="chip" [class]="dir()">
      <app-trend-arrow [value]="value()" />
      <span class="value">{{ text() }}</span>
    </span>
  `,
  styleUrl: './delta-chip.component.scss',
})
export class DeltaChipComponent {
  private readonly language = inject(LanguageService);

  readonly value = input.required<number>();
  readonly digits = input<string>('1.2-2');

  readonly dir = computed<Direction>(() => direction(this.value()));
  readonly text = computed(() =>
    formatSignedPercent(this.value(), this.language.locale, this.digits()),
  );
}
