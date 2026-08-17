import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../core/services/language.service';
import { formatDateTime } from '../../core/util/format.util';
import { AppNotification } from '../../models';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';
import { notificationSeverityTone } from '../../shared/util/tone.util';

/** Dropdown rendering of the Kafka-sourced event feed (blueprint F5.3). */
@Component({
  selector: 'app-notification-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, StatusChipComponent],
  templateUrl: './notification-panel.component.html',
  styleUrl: './notification-panel.component.scss',
})
export class NotificationPanelComponent {
  private readonly language = inject(LanguageService);

  readonly items = input.required<AppNotification[]>();
  readonly unreadCount = input<number>(0);

  readonly dismiss = output<void>();
  readonly toggleRead = output<string>();
  readonly remove = output<string>();
  readonly markAllRead = output<void>();
  readonly clearAll = output<void>();

  readonly tone = notificationSeverityTone;

  when(value: string): string {
    return formatDateTime(value, this.language.locale);
  }
}
