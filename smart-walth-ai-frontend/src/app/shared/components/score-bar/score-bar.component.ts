import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type ScoreTone = 'positive' | 'warning' | 'negative' | 'info';

/** Horizontal 0–100 score meter used for risk and financial-health scores. */
@Component({
  selector: 'app-score-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="meter"
      role="meter"
      [attr.aria-valuenow]="value()"
      [attr.aria-valuemin]="0"
      [attr.aria-valuemax]="max()"
      [attr.aria-label]="label()"
    >
      <div class="meter__fill" [class]="tone()" [style.width.%]="percent()"></div>
    </div>
  `,
  styleUrl: './score-bar.component.scss',
})
export class ScoreBarComponent {
  readonly value = input.required<number>();
  readonly max = input<number>(100);
  readonly tone = input<ScoreTone>('info');
  readonly label = input<string>('');

  readonly percent = computed(() =>
    Math.min(100, Math.max(0, (this.value() / this.max()) * 100)),
  );
}
