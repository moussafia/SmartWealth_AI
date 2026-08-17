import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ModalComponent } from '../modal/modal.component';

/** Confirmation step required before any destructive action in the app. */
@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, ModalComponent],
  template: `
    <app-modal
      [title]="title()"
      [closeLabel]="'common.cancel' | translate"
      (dismissed)="cancelled.emit()"
    >
      <p class="message">{{ message() }}</p>
      @if (detail()) {
        <p class="detail muted">{{ detail() }}</p>
      }

      <button type="button" class="btn" modalActions (click)="cancelled.emit()">
        {{ 'common.cancel' | translate }}
      </button>
      <button
        type="button"
        class="btn"
        [class.btn--danger]="destructive()"
        [class.btn--primary]="!destructive()"
        modalActions
        (click)="confirmed.emit()"
      >
        {{ confirmLabel() || ('common.delete' | translate) }}
      </button>
    </app-modal>
  `,
  styles: `
    .message {
      font-size: var(--font-size-md);
    }

    .detail {
      margin-top: var(--space-2);
      font-size: var(--font-size-sm);
    }
  `,
})
export class ConfirmDialogComponent {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly detail = input<string>('');
  readonly confirmLabel = input<string>('');
  /** Red confirm button; turn off for confirmations that remove nothing. */
  readonly destructive = input<boolean>(true);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}
