import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';

/**
 * Dense table shell: 36px rows, sticky header, low-contrast zebra striping and
 * right-aligned numeric columns via the `.num` class (rules §4).
 *
 * Encapsulation is disabled on purpose so the projected `<table>` markup — which
 * each page owns and types itself — picks up the shared styles. All selectors are
 * namespaced under `.app-data-table`.
 */
@Component({
  selector: 'app-data-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="app-data-table" [class.app-data-table--zebra]="zebra()">
      <div class="app-data-table__scroll" [style.max-height]="maxHeight()">
        <ng-content />
      </div>
    </div>
  `,
  styleUrl: './data-table.component.scss',
})
export class DataTableComponent {
  readonly zebra = input<boolean>(true);
  readonly maxHeight = input<string>('none');
}
