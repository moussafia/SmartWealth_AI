import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, input, output } from '@angular/core';

/**
 * Centred dialog surface. Rendered by the parent inside an `@if`, so opening and
 * closing is plain signal state rather than an imperative service.
 */
@Component({
  selector: 'app-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'dismissed.emit()',
  },
  template: `
    <div class="backdrop" (click)="dismissed.emit()"></div>
    <div
      class="panel"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="title()"
      [class.panel--wide]="wide()"
    >
      <header class="panel__head">
        <div>
          <h2 class="panel__title">{{ title() }}</h2>
          @if (subtitle()) {
            <p class="panel__sub">{{ subtitle() }}</p>
          }
        </div>
        <button
          type="button"
          class="panel__close"
          [attr.aria-label]="closeLabel()"
          (click)="dismissed.emit()"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      <div class="panel__body">
        <ng-content />
      </div>

      <footer class="panel__foot">
        <ng-content select="[modalActions]" />
      </footer>
    </div>
  `,
  styleUrl: './modal.component.scss',
})
export class ModalComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly closeLabel = input<string>('Close');
  readonly wide = input<boolean>(false);

  readonly dismissed = output<void>();

  constructor() {
    effect(() => {
      const focusable = this.host.nativeElement.querySelector<HTMLElement>(
        'input, select, textarea, button:not(.panel__close)',
      );
      focusable?.focus();
    });
  }
}
