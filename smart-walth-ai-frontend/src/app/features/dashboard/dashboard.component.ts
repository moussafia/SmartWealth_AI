/*
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

/!** Ranges offered by the evolution chart, in months. *!/
const RANGES = [3, 6, 12] as const;
type Range = (typeof RANGES)[number];

/!** Blueprint F5.1–F5.3: live valuation, interactive charts and the event feed. *!/
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
 /!* private readonly language = inject(LanguageService);
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
  /!** Blueprint F5.2 — the evolution chart window is user-selectable. *!/
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

  /!** Triage straight from the dashboard, without leaving for the advisor page. *!/
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
  }*!/
}
*/

import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
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

/**
 * These are derived straight from the tone.util function signatures instead of
 * imported/guessed from model files, so they can never be "wrong casing" again —
 * whatever type each tone fn actually expects, that's what these become.
 */
type RiskLevel = Parameters<typeof riskLevelTone>[0];
type Priority = Parameters<typeof priorityTone>[0];
type TxStatus = Parameters<typeof transactionStatusTone>[0];
type TxType = Parameters<typeof transactionTypeTone>[0];
type NotifSeverity = Parameters<typeof notificationSeverityTone>[0];
type WalletType = Parameters<typeof walletTypeChartTone>[0];

/** Static mock shape mirroring what PortfolioService.summary() used to return. */
interface PortfolioSummary {
  updatedAt: string;
  currency: string;
  totalValue: number;
  walletCount: number;
  assetCount: number;
  dayChange: number;
  dayChangePercent: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  cashBalance: number;
  investedValue: number;
  riskScore: number;
  riskLevel: RiskLevel;
  valueHistory: { date: string; value: number }[];
  allocationByType: { type: WalletType; percentage: number }[];
  assetPerformance: { symbol: string; gainLossPercent: number }[];
}

interface Alert {
  id: string;
  type: string;
  severity: Priority;
  createdAt: string;
  title: string;
  message: string;
}

interface FeedItem {
  id: string;
  read: boolean;
  eventType: string;
  severity: NotifSeverity;
  createdAt: string;
  title: string;
  message: string;
}

interface Transaction {
  id: string;
  createdAt: string;
  type: TxType;
  walletId: string;
  assetSymbol: string | null;
  amount: number;
  status: TxStatus;
}

/** Static demo data used in place of PortfolioService/AdvisorService/etc.
 *  The `as unknown as X` casts below are a deliberate escape hatch: we don't know
 *  your real enum casing/values, so we force these literals to compile. If a tone
 *  looks wrong at runtime (e.g. falls back to a default color), that field's literal
 *  doesn't match your real enum — send me tone.util.ts once and I'll swap these for
 *  exact values instead of casts. */
const MOCK_SUMMARY: PortfolioSummary = {
  updatedAt: '2026-09-07T08:30:00Z',
  currency: 'USD',
  totalValue: 128450.32,
  walletCount: 3,
  assetCount: 14,
  dayChange: 842.15,
  dayChangePercent: 0.66,
  totalGainLoss: 18230.5,
  totalGainLossPercent: 16.55,
  cashBalance: 5400,
  investedValue: 123050.32,
  riskScore: 62,
  riskLevel: 'MODERATE' as unknown as RiskLevel,
  valueHistory: [
    { date: '2025-10-01', value: 108000 },
    { date: '2025-11-01', value: 111200 },
    { date: '2025-12-01', value: 114500 },
    { date: '2026-01-01', value: 117800 },
    { date: '2026-02-01', value: 116200 },
    { date: '2026-03-01', value: 120100 },
    { date: '2026-04-01', value: 121950 },
    { date: '2026-05-01', value: 119800 },
    { date: '2026-06-01', value: 123400 },
    { date: '2026-07-01', value: 125100 },
    { date: '2026-08-01', value: 126900 },
    { date: '2026-09-01', value: 128450 },
  ],
  allocationByType: [
    { type: 'STOCKS' as unknown as WalletType, percentage: 48 },
    { type: 'CRYPTO' as unknown as WalletType, percentage: 22 },
    { type: 'BONDS' as unknown as WalletType, percentage: 18 },
    { type: 'CASH' as unknown as WalletType, percentage: 12 },
  ],
  assetPerformance: [
    { symbol: 'AAPL', gainLossPercent: 12.4 },
    { symbol: 'BTC', gainLossPercent: 34.1 },
    { symbol: 'VTI', gainLossPercent: 8.7 },
    { symbol: 'ETH', gainLossPercent: -6.2 },
    { symbol: 'TLT', gainLossPercent: -2.1 },
  ],
};

const MOCK_ALERTS: Alert[] = [
  {
    id: 'a1',
    type: 'rebalance',
    severity: 'WARNING' as unknown as Priority,
    createdAt: '2026-09-06T14:00:00Z',
    title: 'Portfolio drifted from target allocation',
    message: 'Crypto exposure is 6% above your target allocation.',
  },
  {
    id: 'a2',
    type: 'priceAlert',
    severity: 'INFO' as unknown as Priority,
    createdAt: '2026-09-05T09:15:00Z',
    title: 'ETH dropped 6% this week',
    message: 'Consider reviewing your position in ETH.',
  },
];

const MOCK_FEED: FeedItem[] = [
  {
    id: 'n1',
    read: false,
    eventType: 'price',
    severity: 'INFO' as unknown as NotifSeverity,
    createdAt: '2026-09-07T07:50:00Z',
    title: 'BTC up 3.2% today',
    message: 'Bitcoin is leading gains across your portfolio today.',
  },
  {
    id: 'n2',
    read: true,
    eventType: 'system',
    severity: 'INFO' as unknown as NotifSeverity,
    createdAt: '2026-09-06T18:00:00Z',
    title: 'Monthly statement ready',
    message: 'Your August statement is available for download.',
  },
];

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 't1',
    createdAt: '2026-09-06T10:00:00Z',
    type: 'BUY' as unknown as TxType,
    walletId: 'w1',
    assetSymbol: 'AAPL',
    amount: 1200,
    status: 'COMPLETED' as unknown as TxStatus,
  },
  {
    id: 't2',
    createdAt: '2026-09-04T16:30:00Z',
    type: 'DEPOSIT' as unknown as TxType,
    walletId: 'w2',
    assetSymbol: null,
    amount: 2500,
    status: 'COMPLETED' as unknown as TxStatus,
  },
  {
    id: 't3',
    createdAt: '2026-09-02T11:20:00Z',
    type: 'SELL' as unknown as TxType,
    walletId: 'w1',
    assetSymbol: 'ETH',
    amount: 800,
    status: 'PENDING' as unknown as TxStatus,
  },
];

const WALLET_NAMES: Record<string, string> = {
  w1: 'Brokerage',
  w2: 'Savings',
  w3: 'Crypto Wallet',
};

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
  private readonly localeCode = 'en-US';

  readonly summary = signal<PortfolioSummary>(MOCK_SUMMARY);
  readonly activeAlerts = signal<Alert[]>(MOCK_ALERTS);
  readonly latestNotifications = signal<FeedItem[]>(MOCK_FEED);
  private readonly transactionsData = signal<Transaction[]>(MOCK_TRANSACTIONS);

  readonly riskLevelTone = riskLevelTone;
  readonly priorityTone = priorityTone;
  readonly statusTone = transactionStatusTone;
  readonly typeTone = transactionTypeTone;
  readonly severityTone = notificationSeverityTone;

  readonly ranges = RANGES;
  readonly range = signal<Range>(12);

  readonly recentTransactions = computed(() =>
    [...this.transactionsData()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5),
  );

  private readonly history = computed(() => {
    const points = this.summary().valueHistory;
    return points.slice(Math.max(0, points.length - this.range()));
  });

  readonly evolutionLabels = computed(() =>
    this.history().map((point) => formatMonth(point.date, this.localeCode)),
  );

  readonly evolutionSeries = computed<ChartSeries[]>(() => [
    {
      label: 'Value',
      data: this.history().map((point) => point.value),
      tone: 'info',
    },
  ]);

  readonly allocationLabels = computed(() =>
    this.summary().allocationByType.map((slice) => String(slice.type)),
  );

  readonly allocationSeries = computed<ChartSeries[]>(() => {
    const slices = this.summary().allocationByType;
    return [
      {
        label: 'Allocation',
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
        label: 'Gain/Loss',
        data: entries.map((entry) => entry.gainLossPercent),
        tone: entries.map((entry) => (entry.gainLossPercent >= 0 ? 'positive' : 'negative')),
      },
    ];
  });

  setRange(range: Range): void {
    this.range.set(range);
  }

  acknowledge(id: string): void {
    this.activeAlerts.update((alerts) => alerts.filter((alert) => alert.id !== id));
  }

  markRead(id: string): void {
    this.latestNotifications.update((items) =>
      items.map((item) => (item.id === id ? { ...item, read: true } : item)),
    );
  }

  goToTransactions(): void {
    console.log('Navigate to /transactions (static mode, no-op)');
  }

  goToAdvisor(): void {
    console.log('Navigate to /advisor (static mode, no-op)');
  }

  refreshPrices(): void {
    console.log('Refresh prices (static mode, no-op)');
  }

  walletName(walletId: string): string {
    return WALLET_NAMES[walletId] ?? walletId;
  }

  when(value: string): string {
    return formatDateTime(value, this.localeCode);
  }
}
