import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type ChipTone = 'positive' | 'negative' | 'warning' | 'info' | 'neutral' | 'accent';

/** Pill-shaped status label. Tone maps onto the semantic `-bg` / solid token pair. */
@Component({
  selector: 'app-status-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="chip" [class]="tone()"><ng-content /></span>`,
  styleUrl: './status-chip.component.scss',
})
export class StatusChipComponent {
  readonly tone = input<ChipTone>('neutral');
}
