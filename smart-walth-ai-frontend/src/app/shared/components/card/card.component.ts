import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Surface panel: 1px border, --radius-md, --shadow-card, --space-4 padding. */
@Component({
  selector: 'app-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card" [class.card--accent]="accent()" [class.card--flush]="flush()">
      @if (heading() || subheading()) {
        <header class="card__head">
          <div>
            <h2 class="card__title">{{ heading() }}</h2>
            @if (subheading()) {
              <p class="card__sub">{{ subheading() }}</p>
            }
          </div>
          <ng-content select="[cardActions]" />
        </header>
      }
      <div class="card__body">
        <ng-content />
      </div>
    </section>
  `,
  styleUrl: './card.component.scss',
})
export class CardComponent {
  readonly heading = input<string>('');
  readonly subheading = input<string>('');
  /** Draws the single gold focal accent allowed per screen (rules §2). */
  readonly accent = input<boolean>(false);
  /** Removes body padding for edge-to-edge tables. */
  readonly flush = input<boolean>(false);
}
