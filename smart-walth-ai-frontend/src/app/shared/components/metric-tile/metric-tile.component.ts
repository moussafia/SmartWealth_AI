import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Compact KPI tile. The value is projected so callers can drop in an
 * `<app-amount>`, a plain figure or a score. `live` marks tiles whose numbers
 * refresh with market data (rules §5).
 */
@Component({
  selector: 'app-metric-tile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tile" [class.tile--accent]="accent()">
      <span class="tile__label">{{ label() }}</span>
      <div class="tile__value" [attr.aria-live]="live() ? 'polite' : null">
        <ng-content />
      </div>
      <div class="tile__meta">
        <ng-content select="[tileMeta]" />
      </div>
    </div>
  `,
  styleUrl: './metric-tile.component.scss',
})
export class MetricTileComponent {
  readonly label = input.required<string>();
  readonly accent = input<boolean>(false);
  readonly live = input<boolean>(false);
}
