import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Direction, direction } from '../../../core/util/format.util';

/** Directional glyph paired with every coloured delta so colour is never the only cue. */
@Component({
  selector: 'app-trend-arrow',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="arrow" [class]="dir()" aria-hidden="true">{{ glyph() }}</span>`,
  styleUrl: './trend-arrow.component.scss',
})
export class TrendArrowComponent {
  readonly value = input.required<number>();

  readonly dir = computed<Direction>(() => direction(this.value()));

  readonly glyph = computed(() => {
    switch (this.dir()) {
      case 'up':
        return '▲';
      case 'down':
        return '▼';
      default:
        return '–';
    }
  });
}
