import { Injectable, computed, inject, signal } from '@angular/core';
import { forkJoin, tap } from 'rxjs';
import {
  AdminHealth,
  AdvisorAlert,
  AppNotification,
  Asset,
  ChatSession,
  KafkaEventType,
  KafkaTopicName,
  KnowledgeEntry,
  NotificationSeverity,
  PortfolioRisk,
  PortfolioSummary,
  StepStatus,
  Transaction,
  User,
  Wallet,
} from '../../models';
import { JsonDataService } from '../services/json-data.service';
import { newId, nowIso } from '../util/id.util';
import { toWalletDetails } from '../util/portfolio.util';
import { RiskSeed, SummarySeed, deriveRisk, deriveSummary } from '../util/risk.util';

/** A domain event, mirroring what the services would publish to Kafka (§4.3). */
export interface DomainEvent {
  eventType: KafkaEventType;
  topic: KafkaTopicName;
  severity: NotificationSeverity;
  title: string;
  message: string;
}

/**
 * One execution of the agent's multi-step reasoning loop (§5.1). Descriptions,
 * outputs and the conclusion are derived from live state at render time; only
 * the per-step progress lives here.
 */
export interface AnalysisRun {
  id: string;
  query: string;
  startedAt: string;
  completedAt: string | null;
  stepStatuses: StepStatus[];
  stepDurations: number[];
}

/**
 * The single in-memory source of truth for the whole app.
 *
 * Seeded once from the JSON fixtures under `assets/data/`, then mutated purely
 * client-side by the feature stores. There is no backend and no persistence, so
 * a page reload restores the fixtures.
 */
@Injectable({ providedIn: 'root' })
export class AppStateService {
  private readonly json = inject(JsonDataService);

  private readonly userState = signal<User | null>(null);
  private readonly walletState = signal<Wallet[]>([]);
  private readonly assetState = signal<Asset[]>([]);
  private readonly transactionState = signal<Transaction[]>([]);
  private readonly notificationState = signal<AppNotification[]>([]);
  private readonly chatState = signal<ChatSession | null>(null);
  private readonly knowledgeState = signal<KnowledgeEntry[]>([]);
  private readonly healthState = signal<AdminHealth | null>(null);

  /** Alert ids the user has acknowledged or dismissed, kept across recomputation. */
  private readonly acknowledgedAlertState = signal<string[]>([]);
  private readonly dismissedAlertState = signal<string[]>([]);
  private readonly analysisRunState = signal<AnalysisRun | null>(null);
  private readonly reportStampState = signal<string>(nowIso());

  private readonly loadedState = signal(false);
  private readonly updatedAtState = signal(nowIso());

  /** Figures the fixtures provide that cannot be recomputed from live holdings. */
  private summarySeed: SummarySeed = {
    currency: 'USD',
    dayChange: 0,
    dayChangePercent: 0,
    valueHistory: [],
  };
  private riskSeed: RiskSeed = {
    thresholds: { singleAssetMaxPercent: 50, cryptoMaxPercent: 20, singlePositionRulePercent: 5 },
    volatilityBySymbol: {},
  };

  readonly user = this.userState.asReadonly();
  readonly wallets = this.walletState.asReadonly();
  readonly assets = this.assetState.asReadonly();
  readonly transactions = this.transactionState.asReadonly();
  readonly notifications = this.notificationState.asReadonly();
  readonly chat = this.chatState.asReadonly();
  readonly knowledge = this.knowledgeState.asReadonly();
  readonly health = this.healthState.asReadonly();
  readonly acknowledgedAlertIds = this.acknowledgedAlertState.asReadonly();
  readonly dismissedAlertIds = this.dismissedAlertState.asReadonly();
  readonly analysisRun = this.analysisRunState.asReadonly();
  readonly reportStamp = this.reportStampState.asReadonly();
  readonly loaded = this.loadedState.asReadonly();
  readonly updatedAt = this.updatedAtState.asReadonly();

  readonly userId = computed(() => this.userState()?.id ?? '');
  readonly isAdmin = computed(() => this.userState()?.role === 'ADMIN');

  /** Wallets joined to their holdings with valuation rolled up (blueprint F2.3). */
  readonly walletDetails = computed(() => toWalletDetails(this.walletState(), this.assetState()));

  /** Blueprint F2.4 — recomputed on every holdings change. */
  readonly risk = computed<PortfolioRisk>(() =>
    deriveRisk(this.userId(), this.walletDetails(), this.riskSeed, this.updatedAtState()),
  );

  /** Blueprint F5.1 — recomputed on every holdings or cash change. */
  readonly summary = computed<PortfolioSummary>(() =>
    deriveSummary(
      this.userId(),
      this.walletDetails(),
      this.summarySeed,
      this.risk(),
      this.updatedAtState(),
    ),
  );

  readonly thresholds = computed(() => this.risk().thresholds);
  readonly currency = computed(() => this.summarySeed.currency);

  readonly unreadNotificationCount = computed(
    () => this.notificationState().filter((item) => !item.read).length,
  );

  /** Fetches every fixture in parallel and seeds the store exactly once. */
  load() {
    return forkJoin({
      user: this.json.load<User>('user.json'),
      wallets: this.json.load<Wallet[]>('wallets.json'),
      assets: this.json.load<Asset[]>('assets.json'),
      transactions: this.json.load<Transaction[]>('transactions.json'),
      notifications: this.json.load<AppNotification[]>('notifications.json'),
      chat: this.json.load<ChatSession>('advisor-chat.json'),
      alerts: this.json.load<AdvisorAlert[]>('advisor-alerts.json'),
      knowledge: this.json.load<KnowledgeEntry[]>('knowledge-base.json'),
      health: this.json.load<AdminHealth>('admin-health.json'),
      summary: this.json.load<PortfolioSummary>('portfolio-summary.json'),
      risk: this.json.load<PortfolioRisk>('portfolio-risk.json'),
    }).pipe(
      tap((data) => {
        this.summarySeed = {
          currency: data.summary.currency,
          dayChange: data.summary.dayChange,
          dayChangePercent: data.summary.dayChangePercent,
          valueHistory: data.summary.valueHistory,
        };
        this.riskSeed = {
          thresholds: data.risk.thresholds,
          volatilityBySymbol: Object.fromEntries(
            data.risk.byAsset.map((entry) => [entry.symbol, entry.volatilityPercent]),
          ),
        };

        this.userState.set(data.user);
        this.walletState.set(data.wallets);
        this.assetState.set(data.assets);
        this.transactionState.set(data.transactions);
        this.notificationState.set(data.notifications);
        this.chatState.set(data.chat);
        this.knowledgeState.set(data.knowledge);
        this.healthState.set(data.health);

        // Alerts are re-derived from the live rules, so the fixture only decides
        // which of them start out already acknowledged.
        this.acknowledgedAlertState.set(
          data.alerts.filter((alert) => alert.acknowledged).map((alert) => alertIdForType(alert)),
        );

        this.loadedState.set(true);
      }),
    );
  }

  // --- Mutations, all funnelled through here so `updatedAt` stays honest ---

  setUser(user: User): void {
    this.userState.set(user);
    this.touch();
  }

  setWallets(wallets: Wallet[]): void {
    this.walletState.set(wallets);
    this.touch();
  }

  setAssets(assets: Asset[]): void {
    this.assetState.set(assets);
    this.touch();
  }

  setTransactions(transactions: Transaction[]): void {
    this.transactionState.set(transactions);
    this.touch();
  }

  setNotifications(notifications: AppNotification[]): void {
    this.notificationState.set(notifications);
  }

  setChat(session: ChatSession): void {
    this.chatState.set(session);
  }

  setHealth(health: AdminHealth): void {
    this.healthState.set(health);
  }

  setAnalysisRun(run: AnalysisRun | null): void {
    this.analysisRunState.set(run);
  }

  patchAnalysisRun(change: Partial<AnalysisRun>): void {
    this.analysisRunState.update((run) => (run ? { ...run, ...change } : run));
  }

  stampReport(): void {
    this.reportStampState.set(nowIso());
  }

  acknowledgeAlert(id: string): void {
    this.acknowledgedAlertState.update((ids) => (ids.includes(id) ? ids : [...ids, id]));
  }

  dismissAlert(id: string): void {
    this.dismissedAlertState.update((ids) => (ids.includes(id) ? ids : [...ids, id]));
  }

  restoreAlerts(): void {
    this.acknowledgedAlertState.set([]);
    this.dismissedAlertState.set([]);
  }

  /**
   * Publishes a domain event onto the notification feed, standing in for the
   * Kafka topics the services would produce to.
   */
  publish(event: DomainEvent): void {
    const notification: AppNotification = {
      id: newId(),
      eventType: event.eventType,
      topic: event.topic,
      channel: 'PUSH',
      severity: event.severity,
      title: event.title,
      message: event.message,
      read: false,
      createdAt: nowIso(),
    };
    this.notificationState.update((items) => [notification, ...items]);
  }

  private touch(): void {
    this.updatedAtState.set(nowIso());
  }
}

/** Stable id per alert rule, so acknowledgements survive recomputation. */
function alertIdForType(alert: AdvisorAlert): string {
  return alert.transactionId
    ? `alert-${alert.type}-${alert.transactionId}`
    : `alert-${alert.type}`;
}
