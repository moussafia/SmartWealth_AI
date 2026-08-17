import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { AdminService } from '../../core/services/admin.service';
import { LanguageService } from '../../core/services/language.service';
import { formatDateTime, formatNumberValue, formatPercent } from '../../core/util/format.util';
import { KafkaTopicHealth, MicroserviceHealth } from '../../models';
import { CardComponent } from '../../shared/components/card/card.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import { MetricTileComponent } from '../../shared/components/metric-tile/metric-tile.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';
import { serviceStatusTone } from '../../shared/util/tone.util';

/** Blueprint F5.5 (COULD): service health, infrastructure and Kafka queue monitoring. */
@Component({
  selector: 'app-admin',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslatePipe,
    PageHeaderComponent,
    CardComponent,
    MetricTileComponent,
    DataTableComponent,
    StatusChipComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
})
export class AdminComponent {
  private readonly language = inject(LanguageService);
  private readonly admin = inject(AdminService);

  readonly health = this.admin.health;
  readonly services = this.admin.services;
  readonly infrastructure = this.admin.infrastructure;
  readonly kafkaTopics = this.admin.kafkaTopics;

  readonly servicesUp = this.admin.servicesUp;
  readonly serviceCount = this.admin.serviceCount;
  readonly totalLag = this.admin.totalLag;
  readonly deadLetterTotal = this.admin.deadLetterTotal;
  readonly throughput = this.admin.throughput;

  readonly statusTone = serviceStatusTone;

  readonly pendingRestart = signal<MicroserviceHealth | null>(null);
  readonly pendingReplay = signal<KafkaTopicHealth | null>(null);

  refresh(): void {
    this.admin.refresh();
  }

  requestRestart(service: MicroserviceHealth): void {
    this.pendingRestart.set(service);
  }

  restart(): void {
    const target = this.pendingRestart();
    if (!target) return;
    this.admin.restartService(target.id);
    this.pendingRestart.set(null);
  }

  requestReplay(topic: KafkaTopicHealth): void {
    this.pendingReplay.set(topic);
  }

  /** Blueprint F3.4 — drains the dead letter topic and re-submits its messages. */
  replay(): void {
    const target = this.pendingReplay();
    if (!target) return;
    this.admin.replayDeadLetters(target.name);
    this.pendingReplay.set(null);
  }

  drainLag(topic: KafkaTopicHealth): void {
    this.admin.drainLag(topic.name);
  }

  percent(value: number): string {
    return formatPercent(value, this.language.locale);
  }

  number(value: number): string {
    return formatNumberValue(value, this.language.locale, '1.0-0');
  }

  when(value: string): string {
    return formatDateTime(value, this.language.locale);
  }
}
