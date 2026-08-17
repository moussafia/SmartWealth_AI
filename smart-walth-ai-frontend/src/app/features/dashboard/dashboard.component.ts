import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AdvisorService } from '../../core/services/advisor.service';
import { LanguageService } from '../../core/services/language.service';
import { NotificationFeedService } from '../../core/services/notification.service';
import { PortfolioService } from '../../core/services/portfolio.service';
import { TransactionService } from '../../core/services/transaction.service';
import { formatDateTime, formatMonth } from '../../core/util/format.util';
import { AmountComponent } from '../../shared/components/amount/amount.component';
import { CardComponent } from '../../shared/components/card/card.component';
import { ChartComponent, ChartSeries } from '../../shared/components/chart/chart.component';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import { DeltaChipComponent } from '../../shared/components/delta-chip/delta-chip.component';
import { MetricTileComponent } from '../../shared/components/metric-tile/metric-tile.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ScoreBarComponent } from '../../shared/components/score-bar/score-bar.component';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';
import {
  notificationSeverityTone,
  priorityTone,
  riskLevelTone,
  transactionStatusTone,
  transactionTypeTone,
  walletTypeChartTone,
} from '../../shared/util/tone.util';

/** Ranges offered by the evolution chart, in months. */
const RANGES = [3, 6, 12] as const;
type Range = (typeof RANGES)[number];

/** Blueprint F5.1–F5.3: live valuation, interactive charts and the event feed. */
@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslatePipe,
    PageHeaderComponent,
    MetricTileComponent,
    CardComponent,
    ChartComponent,
    DataTableComponent,
    AmountComponent,
    DeltaChipComponent,
    StatusChipComponent,
    ScoreBarComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private readonly language = inject(LanguageService);
  private readonly router = inject(Router);
  private readonly portfolio = inject(PortfolioService);
  private readonly advisor = inject(AdvisorService);
  private readonly feed = inject(NotificationFeedService);
  private readonly transactions = inject(TransactionService);

  readonly summary = this.portfolio.summary;
  readonly alerts = this.advisor.alerts;
  readonly activeAlerts = this.advisor.activeAlerts;
  readonly latestNotifications = this.feed.latest;

  readonly riskLevelTone = riskLevelTone;
  readonly priorityTone = priorityTone;
  readonly statusTone = transactionStatusTone;
  readonly typeTone = transactionTypeTone;
  readonly severityTone = notificationSeverityTone;

  readonly ranges = RANGES;
  /** Blueprint F5.2 — the evolution chart window is user-selectable. */
  readonly range = signal<Range>(12);

  readonly recentTransactions = computed(() =>
    [...this.transactions.all()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5),
  );

  private readonly history = computed(() => {
    const points = this.summary().valueHistory;
    return points.slice(Math.max(0, points.length - this.range()));
  });

  readonly evolutionLabels = computed(() =>
    this.history().map((point) => formatMonth(point.date, this.locale())),
  );

  readonly evolutionSeries = computed<ChartSeries[]>(() => [
    {
      label: this.language.instant('dashboard.seriesValue'),
      data: this.history().map((point) => point.value),
      tone: 'info',
    },
  ]);

  readonly allocationLabels = computed(() =>
    this.summary().allocationByType.map((slice) =>
      this.language.instant(`walletType.${slice.type}`),
    ),
  );

  readonly allocationSeries = computed<ChartSeries[]>(() => {
    const slices = this.summary().allocationByType;
    return [
      {
        label: this.language.instant('common.allocation'),
        data: slices.map((slice) => slice.percentage),
        tone: slices.map((slice) => walletTypeChartTone(slice.type)),
      },
    ];
  });

  readonly performanceLabels = computed(() =>
    this.summary().assetPerformance.map((entry) => entry.symbol),
  );

  readonly performanceSeries = computed<ChartSeries[]>(() => {
    const entries = this.summary().assetPerformance;
    return [
      {
        label: this.language.instant('dashboard.seriesGain'),
        data: entries.map((entry) => entry.gainLossPercent),
        tone: entries.map((entry) => (entry.gainLossPercent >= 0 ? 'positive' : 'negative')),
      },
    ];
  });

  setRange(range: Range): void {
    this.range.set(range);
  }

  /** Triage straight from the dashboard, without leaving for the advisor page. */
  acknowledge(id: string): void {
    this.advisor.acknowledge(id);
  }

  markRead(id: string): void {
    this.feed.markRead(id);
  }

  goToTransactions(): void {
    void this.router.navigate(['/transactions']);
  }

  goToAdvisor(): void {
    void this.router.navigate(['/advisor']);
  }

  refreshPrices(): void {
    this.portfolio.refreshPrices();
  }

  walletName(walletId: string): string {
    return this.portfolio.walletName(walletId);
  }

  when(value: string): string {
    return formatDateTime(value, this.locale());
  }

  private locale(): string {
    return this.language.locale;
  }
}
