import { Injectable, computed, inject } from '@angular/core';
import {
  AdvisorAlert,
  AdvisorAnalysis,
  AdvisorTool,
  AnalysisStep,
  HealthReport,
  Priority,
  Recommendation,
  ReportMetric,
  SpendingPattern,
  Transaction,
  TransactionType,
} from '../../models';
import { AppStateService } from '../state/app-state.service';
import { formatMoney, formatNumberValue, formatPercent, formatSignedPercent } from '../util/format.util';
import { sum } from '../util/portfolio.util';
import { LanguageService } from './language.service';

/** The tool sequence the agent walks for a full analysis (blueprint §5.1). */
export const ANALYSIS_TOOLS: readonly AdvisorTool[] = [
  'get_portfolio',
  'get_transaction_history',
  'calculate_risk_score',
  'search_financial_knowledge',
  'generate_health_report',
];

const WINDOW_DAYS = 30;
/** Blueprint F3.5: a transaction is anomalous past three standard deviations. */
const ANOMALY_SIGMA = 3;
/** Blueprint kb-005: an emergency fund should cover three to six months. */
const EMERGENCY_FUND_MIN_MONTHS = 3;
const EMERGENCY_FUND_MAX_MONTHS = 6;

export interface WindowStats {
  type: TransactionType;
  total: number;
  count: number;
  average: number;
  previousTotal: number;
  changePercent: number;
}

/**
 * Deterministic stand-in for the LangChain4j agent. Every figure the agent
 * "reports" is derived from the live store, so its narrative can never drift
 * from what the rest of the UI shows. Text is resolved through the active
 * language, which is why these are computed rather than stored snapshots.
 */
@Injectable({ providedIn: 'root' })
export class AdvisorEngineService {
  private readonly state = inject(AppStateService);
  private readonly language = inject(LanguageService);

  // --- Transaction windows -------------------------------------------------

  private readonly settled = computed(() =>
    this.state.transactions().filter((tx) => tx.status === 'DONE'),
  );

  readonly recentTransactions = computed(() => this.inWindow(this.settled(), 0, WINDOW_DAYS));

  readonly anomalies = computed(() => this.recentTransactions().filter((tx) => tx.isAnomaly));

  readonly failedCount = computed(
    () => this.inWindow(this.state.transactions(), 0, WINDOW_DAYS).filter((tx) => tx.status === 'FAIL').length,
  );

  /** Blueprint F4 "détection de patterns" — per-type totals against the prior window. */
  readonly spendingPatterns = computed<SpendingPattern[]>(() =>
    (['WITHDRAW', 'DEPOSIT', 'BUY', 'SELL'] as TransactionType[]).map((type) => {
      const stats = this.statsFor(type);
      return {
        id: `sp-${type.toLowerCase()}`,
        label: this.language.instant(`txType.${type}`),
        periodDays: WINDOW_DAYS,
        totalAmount: stats.total,
        transactionCount: stats.count,
        averageAmount: stats.average,
        changePercent: stats.changePercent,
        flagged: stats.changePercent >= 100 && stats.count > 0,
      };
    }),
  );

  /** Mean + 3σ of settled amounts of the same type, the F3.5 anomaly bound. */
  anomalyThreshold(type: TransactionType): number {
    const amounts = this.inWindow(this.settled(), 0, WINDOW_DAYS)
      .filter((tx) => tx.type === type && !tx.isAnomaly)
      .map((tx) => tx.amount);

    if (amounts.length < 2) return Number.POSITIVE_INFINITY;

    const mean = sum(amounts) / amounts.length;
    const variance = sum(amounts.map((value) => (value - mean) ** 2)) / amounts.length;
    return mean + ANOMALY_SIGMA * Math.sqrt(variance);
  }

  // --- Derived report figures ---------------------------------------------

  readonly cryptoExposurePercent = computed(() => {
    const slice = this.state.summary().allocationByType.find((entry) => entry.type === 'CRYPTO');
    return slice?.percentage ?? 0;
  });

  readonly savingsCash = computed(() =>
    sum(
      this.state
        .walletDetails()
        .filter((wallet) => wallet.type === 'SAVINGS')
        .map((wallet) => wallet.balance),
    ),
  );

  /** Recurring withdrawals only: a one-off anomaly is not a monthly expense. */
  readonly monthlyExpenses = computed(() =>
    sum(
      this.recentTransactions()
        .filter((tx) => tx.type === 'WITHDRAW' && !tx.isAnomaly)
        .map((tx) => tx.amount),
    ),
  );

  readonly emergencyFundMonths = computed(() => {
    const expenses = this.monthlyExpenses();
    if (expenses <= 0) return 0;
    return round(this.savingsCash() / expenses, 1);
  });

  readonly netFlow = computed(() => {
    const deposits = sum(
      this.recentTransactions().filter((tx) => tx.type === 'DEPOSIT').map((tx) => tx.amount),
    );
    const withdrawals = sum(
      this.recentTransactions().filter((tx) => tx.type === 'WITHDRAW').map((tx) => tx.amount),
    );
    return round(deposits - withdrawals);
  });

  readonly breachesFivePercentRule = computed(() =>
    this.state.risk().byAsset.filter((entry) => entry.exceedsSinglePositionRule),
  );

  readonly breachesSingleAssetCap = computed(() =>
    this.state.risk().byAsset.filter((entry) => entry.exceedsSingleAssetThreshold),
  );

  /**
   * Composite wellbeing score: starts from the inverse of portfolio risk, then
   * penalises threshold breaches and anomalies and rewards a funded buffer.
   */
  readonly healthScore = computed(() => {
    const risk = this.state.risk();
    const cryptoOver = this.cryptoExposurePercent() > risk.thresholds.cryptoMaxPercent;
    const months = this.emergencyFundMonths();

    let score = 100 - 0.5 * risk.overallScore;
    if (cryptoOver) score -= 10;
    score -= 5 * this.anomalies().length;
    score -= 8 * this.breachesSingleAssetCap().length;
    if (months >= EMERGENCY_FUND_MIN_MONTHS) score += 10;

    return Math.max(0, Math.min(100, Math.round(score)));
  });

  // --- Alerts (blueprint F2.5 / F3.5 / F4) --------------------------------

  /** Every alert the rules currently produce, before the user's own triage. */
  private readonly derivedAlerts = computed<AdvisorAlert[]>(() => {
    const risk = this.state.risk();
    const alerts: AdvisorAlert[] = [];
    const crypto = this.cryptoExposurePercent();
    const heaviest = risk.byAsset[0];

    if (crypto > risk.thresholds.cryptoMaxPercent) {
      alerts.push({
        id: 'alert-CRYPTO_EXPOSURE',
        type: 'CRYPTO_EXPOSURE',
        severity: 'HIGH',
        title: this.t('alertRule.cryptoTitle'),
        message: this.t('alertRule.cryptoMessage', {
          actual: this.percent(crypto),
          threshold: this.percent(risk.thresholds.cryptoMaxPercent),
        }),
        assetSymbol:
          risk.byAsset.find((entry) => entry.walletType === 'CRYPTO')?.symbol ?? null,
        transactionId: null,
        thresholdPercent: risk.thresholds.cryptoMaxPercent,
        actualPercent: crypto,
        createdAt: this.state.updatedAt(),
        acknowledged: false,
      });
    }

    for (const tx of this.anomalies()) {
      alerts.push({
        id: `alert-ANOMALY_DETECTED-${tx.id}`,
        type: 'ANOMALY_DETECTED',
        severity: 'HIGH',
        title: this.t('alertRule.anomalyTitle'),
        message: this.t('alertRule.anomalyMessage', {
          type: this.t(`txType.${tx.type}`),
          amount: this.money(tx.amount),
          sigma: ANOMALY_SIGMA,
          days: WINDOW_DAYS,
        }),
        assetSymbol: tx.assetSymbol,
        transactionId: tx.id,
        thresholdPercent: null,
        actualPercent: null,
        createdAt: tx.createdAt,
        acknowledged: false,
      });
    }

    for (const pattern of this.spendingPatterns().filter((entry) => entry.flagged)) {
      alerts.push({
        id: `alert-SPENDING_PATTERN-${pattern.id}`,
        type: 'SPENDING_PATTERN',
        severity: 'MEDIUM',
        title: this.t('alertRule.spendingTitle', { label: pattern.label }),
        message: this.t('alertRule.spendingMessage', {
          label: pattern.label.toLowerCase(),
          days: WINDOW_DAYS,
          change: formatSignedPercent(pattern.changePercent, this.language.locale, '1.0-1'),
        }),
        assetSymbol: null,
        transactionId: null,
        thresholdPercent: null,
        actualPercent: pattern.changePercent,
        createdAt: this.state.updatedAt(),
        acknowledged: false,
      });
    }

    const overCap = this.breachesSingleAssetCap();
    const overRule = this.breachesFivePercentRule();

    if (overCap.length > 0) {
      alerts.push({
        id: 'alert-OVERCONCENTRATION',
        type: 'OVERCONCENTRATION',
        severity: 'HIGH',
        title: this.t('alertRule.overCapTitle'),
        message: this.t('alertRule.overCapMessage', {
          symbol: overCap[0].symbol,
          actual: this.percent(overCap[0].weightPercent),
          threshold: this.percent(risk.thresholds.singleAssetMaxPercent),
        }),
        assetSymbol: overCap[0].symbol,
        transactionId: null,
        thresholdPercent: risk.thresholds.singleAssetMaxPercent,
        actualPercent: overCap[0].weightPercent,
        createdAt: this.state.updatedAt(),
        acknowledged: false,
      });
    } else if (overRule.length > 0) {
      alerts.push({
        id: 'alert-OVERCONCENTRATION',
        type: 'OVERCONCENTRATION',
        severity: 'LOW',
        title: this.t('alertRule.overRuleTitle', {
          threshold: this.percent(risk.thresholds.singlePositionRulePercent),
        }),
        message: this.t('alertRule.overRuleMessage', {
          count: overRule.length,
          threshold: this.percent(risk.thresholds.singlePositionRulePercent),
          cap: this.percent(risk.thresholds.singleAssetMaxPercent),
        }),
        assetSymbol: heaviest?.symbol ?? null,
        transactionId: null,
        thresholdPercent: risk.thresholds.singlePositionRulePercent,
        actualPercent: heaviest?.weightPercent ?? null,
        createdAt: this.state.updatedAt(),
        acknowledged: false,
      });
    }

    return alerts;
  });

  /** Rule output with the user's acknowledgements and dismissals applied. */
  readonly alerts = computed<AdvisorAlert[]>(() => {
    const acknowledged = new Set(this.state.acknowledgedAlertIds());
    const dismissed = new Set(this.state.dismissedAlertIds());

    return this.derivedAlerts()
      .filter((alert) => !dismissed.has(alert.id))
      .map((alert) => ({ ...alert, acknowledged: acknowledged.has(alert.id) }))
      .sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
  });

  readonly activeAlerts = computed(() => this.alerts().filter((alert) => !alert.acknowledged));

  /** True when a dismissed or acknowledged alert could be brought back. */
  readonly hasTriagedAlerts = computed(
    () => this.state.acknowledgedAlertIds().length + this.state.dismissedAlertIds().length > 0,
  );

  // --- Health report (blueprint F4 "rapport de santé") --------------------

  readonly report = computed<HealthReport>(() => {
    const risk = this.state.risk();
    const summary = this.state.summary();
    const generatedAt = this.state.reportStamp();
    const periodEnd = generatedAt.slice(0, 10);
    const periodStart = new Date(new Date(generatedAt).getTime() - 6 * 86400000)
      .toISOString()
      .slice(0, 10);

    const metrics: ReportMetric[] = [
      {
        key: 'totalValue',
        label: this.t('common.totalValue'),
        value: summary.totalValue,
        unit: 'USD',
      },
      {
        key: 'netFlow',
        label: this.t('report.netFlow', { days: WINDOW_DAYS }),
        value: this.netFlow(),
        unit: 'USD',
      },
      {
        key: 'emergencyFundMonths',
        label: this.t('report.emergencyFund'),
        value: this.emergencyFundMonths(),
        unit: 'MONTHS',
      },
      {
        key: 'cryptoExposure',
        label: this.t('alertType.CRYPTO_EXPOSURE'),
        value: this.cryptoExposurePercent(),
        unit: 'PERCENT',
      },
    ];

    return {
      id: `rep-${periodEnd}`,
      userId: this.state.userId(),
      periodStart,
      periodEnd,
      generatedAt,
      healthScore: this.healthScore(),
      riskScore: risk.overallScore,
      riskLevel: risk.level,
      summary: this.reportSummary(),
      metrics,
      recommendations: this.recommendations(),
      spendingPatterns: this.spendingPatterns(),
    };
  });

  private reportSummary(): string {
    const summary = this.state.summary();
    const anomalyCount = this.anomalies().length;

    return this.t('report.summary', {
      gain: formatSignedPercent(summary.totalGainLossPercent, this.language.locale),
      value: this.money(summary.totalValue),
      health: this.healthScore(),
      risk: this.t(`riskLevel.${this.state.risk().level}`).toLowerCase(),
      anomalies: anomalyCount,
    });
  }

  /** Rule-driven advice, each traced back to a RAG entry where one applies. */
  private recommendations(): Recommendation[] {
    const risk = this.state.risk();
    const summary = this.state.summary();
    const out: Recommendation[] = [];
    const crypto = this.cryptoExposurePercent();

    if (crypto > risk.thresholds.cryptoMaxPercent) {
      const excessValue = ((crypto - risk.thresholds.cryptoMaxPercent) / 100) * summary.totalValue;
      out.push({
        id: 'rec-crypto',
        priority: 'HIGH',
        title: this.t('rec.cryptoTitle', {
          threshold: this.percent(risk.thresholds.cryptoMaxPercent),
        }),
        detail: this.t('rec.cryptoDetail', {
          amount: this.money(excessValue),
          actual: this.percent(crypto),
          threshold: this.percent(risk.thresholds.cryptoMaxPercent),
        }),
        knowledgeRefId: 'kb-004',
      });
    }

    for (const tx of this.anomalies()) {
      out.push({
        id: `rec-anomaly-${tx.id}`,
        priority: 'HIGH',
        title: this.t('rec.anomalyTitle', { type: this.t(`txType.${tx.type}`).toLowerCase() }),
        detail: this.t('rec.anomalyDetail', {
          amount: this.money(tx.amount),
          sigma: ANOMALY_SIGMA,
          days: WINDOW_DAYS,
        }),
        knowledgeRefId: null,
      });
    }

    const overCap = this.breachesSingleAssetCap();
    if (overCap.length > 0) {
      out.push({
        id: 'rec-overcap',
        priority: 'HIGH',
        title: this.t('rec.overCapTitle', { symbol: overCap[0].symbol }),
        detail: this.t('rec.overCapDetail', {
          symbol: overCap[0].symbol,
          actual: this.percent(overCap[0].weightPercent),
          threshold: this.percent(risk.thresholds.singleAssetMaxPercent),
        }),
        knowledgeRefId: 'kb-006',
      });
    }

    const overRule = this.breachesFivePercentRule();
    if (overRule.length > 0) {
      out.push({
        id: 'rec-fivepercent',
        priority: 'MEDIUM',
        title: this.t('rec.fiveRuleTitle', {
          count: overRule.length,
          threshold: this.percent(risk.thresholds.singlePositionRulePercent),
        }),
        detail: this.t('rec.fiveRuleDetail', {
          count: overRule.length,
          threshold: this.percent(risk.thresholds.singlePositionRulePercent),
        }),
        knowledgeRefId: 'kb-001',
      });
    }

    const months = this.emergencyFundMonths();
    if (months < EMERGENCY_FUND_MIN_MONTHS) {
      out.push({
        id: 'rec-fund-low',
        priority: 'HIGH',
        title: this.t('rec.fundLowTitle'),
        detail: this.t('rec.fundLowDetail', {
          months: this.months(months),
          min: EMERGENCY_FUND_MIN_MONTHS,
          max: EMERGENCY_FUND_MAX_MONTHS,
        }),
        knowledgeRefId: 'kb-005',
      });
    } else if (months > EMERGENCY_FUND_MAX_MONTHS) {
      out.push({
        id: 'rec-fund-high',
        priority: 'LOW',
        title: this.t('rec.fundHighTitle'),
        detail: this.t('rec.fundHighDetail', {
          months: this.months(months),
          max: EMERGENCY_FUND_MAX_MONTHS,
        }),
        knowledgeRefId: 'kb-005',
      });
    } else {
      out.push({
        id: 'rec-fund-ok',
        priority: 'LOW',
        title: this.t('rec.fundOkTitle'),
        detail: this.t('rec.fundOkDetail', {
          months: this.months(months),
          min: EMERGENCY_FUND_MIN_MONTHS,
          max: EMERGENCY_FUND_MAX_MONTHS,
        }),
        knowledgeRefId: 'kb-005',
      });
    }

    if (out.length === 1) {
      out.unshift({
        id: 'rec-healthy',
        priority: 'LOW',
        title: this.t('rec.healthyTitle'),
        detail: this.t('rec.healthyDetail', { score: this.state.risk().overallScore }),
        knowledgeRefId: 'kb-003',
      });
    }

    return out.sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority));
  }

  // --- Multi-step analysis (blueprint §5.1) -------------------------------

  readonly analysis = computed<AdvisorAnalysis | null>(() => {
    const run = this.state.analysisRun();
    if (!run) return null;

    const steps: AnalysisStep[] = ANALYSIS_TOOLS.map((tool, index) => ({
      step: index + 1,
      tool,
      description: this.t(`toolStep.${tool}`),
      status: run.stepStatuses[index],
      durationMs: run.stepDurations[index],
      output:
        run.stepStatuses[index] === 'DONE' ? this.stepOutput(tool) : this.t('advisor.stepWaiting'),
    }));

    return {
      id: run.id,
      userId: this.state.userId(),
      query: run.query,
      startedAt: run.startedAt,
      completedAt: run.completedAt ?? run.startedAt,
      durationMs: sum(run.stepDurations),
      steps,
      conclusion: run.completedAt ? this.conclusion() : '',
    };
  });

  private stepOutput(tool: AdvisorTool): string {
    const summary = this.state.summary();
    const risk = this.state.risk();

    switch (tool) {
      case 'get_portfolio':
        return this.t('toolOutput.get_portfolio', {
          wallets: summary.walletCount,
          assets: summary.assetCount,
          value: this.money(summary.totalValue),
        });
      case 'get_transaction_history':
        return this.t('toolOutput.get_transaction_history', {
          count: this.recentTransactions().length,
          days: WINDOW_DAYS,
          anomalies: this.anomalies().length,
          failed: this.failedCount(),
        });
      case 'calculate_risk_score':
        return this.t('toolOutput.calculate_risk_score', {
          score: risk.overallScore,
          concentration: risk.concentrationScore,
          volatility: risk.volatilityScore,
          sharpe: formatNumberValue(risk.sharpeRatio, this.language.locale, '1.2-2'),
        });
      case 'search_financial_knowledge':
        return this.t('toolOutput.search_financial_knowledge', {
          count: this.state.knowledge().length,
        });
      case 'generate_health_report':
        return this.t('toolOutput.generate_health_report', {
          count: this.report().recommendations.length,
          health: this.healthScore(),
        });
      case 'detect_anomalies':
        return this.t('toolOutput.detect_anomalies', { count: this.anomalies().length });
    }
  }

  private conclusion(): string {
    const risk = this.state.risk();
    const crypto = this.cryptoExposurePercent();
    const overRule = this.breachesFivePercentRule().length;

    return this.t(
      crypto > risk.thresholds.cryptoMaxPercent
        ? 'advisor.conclusionCryptoOver'
        : 'advisor.conclusionBalanced',
      {
        crypto: this.percent(crypto),
        threshold: this.percent(risk.thresholds.cryptoMaxPercent),
        cap: this.percent(risk.thresholds.singleAssetMaxPercent),
        breaches: overRule,
        level: this.t(`riskLevel.${risk.level}`).toLowerCase(),
      },
    );
  }

  // --- Chat (blueprint F5.4) ---------------------------------------------

  /**
   * Picks the tools a question needs and answers from live state. Intent is
   * matched on keywords in both supported languages.
   */
  replyTo(question: string): { content: string; tools: AdvisorTool[] } {
    const text = question.toLowerCase();
    const summary = this.state.summary();
    const risk = this.state.risk();

    if (matches(text, ['divers', 'répart', 'repart', 'allocation', 'concentr', 'weight'])) {
      return {
        tools: ['get_portfolio', 'calculate_risk_score', 'search_financial_knowledge'],
        content: this.t('chatReply.diversification', {
          stocks: this.percent(this.sharePercent('STOCKS')),
          savings: this.percent(this.sharePercent('SAVINGS')),
          crypto: this.percent(this.sharePercent('CRYPTO')),
          threshold: this.percent(risk.thresholds.cryptoMaxPercent),
          breaches: this.breachesFivePercentRule().length,
          rule: this.percent(risk.thresholds.singlePositionRulePercent),
        }),
      };
    }

    if (matches(text, ['dépens', 'depens', 'retrait', 'anomal', 'spend', 'withdraw', 'unusual'])) {
      const anomalies = this.anomalies();
      return {
        tools: ['get_transaction_history', 'detect_anomalies'],
        content: anomalies.length
          ? this.t('chatReply.anomalyFound', {
              count: anomalies.length,
              amount: this.money(anomalies[0].amount),
              type: this.t(`txType.${anomalies[0].type}`).toLowerCase(),
              days: WINDOW_DAYS,
            })
          : this.t('chatReply.anomalyNone', {
              count: this.recentTransactions().length,
              days: WINDOW_DAYS,
            }),
      };
    }

    if (matches(text, ['risqu', 'risk', 'volatil', 'sharpe'])) {
      return {
        tools: ['calculate_risk_score'],
        content: this.t('chatReply.risk', {
          score: risk.overallScore,
          level: this.t(`riskLevel.${risk.level}`).toLowerCase(),
          concentration: risk.concentrationScore,
          volatility: risk.volatilityScore,
          sharpe: formatNumberValue(risk.sharpeRatio, this.language.locale, '1.2-2'),
        }),
      };
    }

    if (matches(text, ['conseil', 'recommand', 'advice', 'recommend', 'que faire', 'should i'])) {
      const recommendations = this.report().recommendations.slice(0, 3);
      return {
        tools: ['generate_health_report', 'search_financial_knowledge'],
        content: this.t('chatReply.advice', {
          count: recommendations.length,
          list: recommendations.map((rec, index) => `${index + 1}) ${rec.title}`).join(' ; '),
        }),
      };
    }

    if (matches(text, ['épargne', 'epargne', 'urgence', 'saving', 'emergency', 'fund'])) {
      return {
        tools: ['get_portfolio', 'search_financial_knowledge'],
        content: this.t('chatReply.savings', {
          cash: this.money(this.savingsCash()),
          months: this.months(this.emergencyFundMonths()),
          min: EMERGENCY_FUND_MIN_MONTHS,
          max: EMERGENCY_FUND_MAX_MONTHS,
        }),
      };
    }

    return {
      tools: ['get_portfolio'],
      content: this.t('chatReply.overview', {
        value: this.money(summary.totalValue),
        wallets: summary.walletCount,
        assets: summary.assetCount,
        gain: formatSignedPercent(summary.totalGainLossPercent, this.language.locale),
        cash: this.money(summary.cashBalance),
      }),
    };
  }

  /** Matches the RAG lookup the agent performs, exposed for the UI search box. */
  searchKnowledge(query: string) {
    const needle = query.trim().toLowerCase();
    const entries = this.state.knowledge();
    if (!needle) return entries;

    return entries.filter((entry) =>
      [entry.title, entry.content, entry.id, this.t(`kbCategory.${entry.category}`)]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }

  // --- Helpers -----------------------------------------------------------

  private sharePercent(type: 'STOCKS' | 'SAVINGS' | 'CRYPTO'): number {
    return (
      this.state.summary().allocationByType.find((entry) => entry.type === type)?.percentage ?? 0
    );
  }

  private statsFor(type: TransactionType): WindowStats {
    const current = this.inWindow(this.settled(), 0, WINDOW_DAYS).filter((tx) => tx.type === type);
    const previous = this.inWindow(this.settled(), WINDOW_DAYS, WINDOW_DAYS * 2).filter(
      (tx) => tx.type === type,
    );

    const total = round(sum(current.map((tx) => tx.amount)));
    const previousTotal = round(sum(previous.map((tx) => tx.amount)));

    return {
      type,
      total,
      count: current.length,
      average: current.length === 0 ? 0 : round(total / current.length),
      previousTotal,
      changePercent:
        previousTotal === 0 ? (total === 0 ? 0 : 100) : round(((total - previousTotal) / previousTotal) * 100, 1),
    };
  }

  private inWindow(transactions: Transaction[], fromDaysAgo: number, toDaysAgo: number) {
    const now = Date.now();
    const newest = now - fromDaysAgo * 86400000;
    const oldest = now - toDaysAgo * 86400000;

    return transactions.filter((tx) => {
      const at = new Date(tx.createdAt).getTime();
      return at <= newest && at > oldest;
    });
  }

  private t(key: string, params?: Record<string, unknown>): string {
    return this.language.instant(key, params);
  }

  private money(value: number): string {
    return formatMoney(value, this.language.locale, this.state.currency());
  }

  private percent(value: number): string {
    return formatPercent(value, this.language.locale);
  }

  private months(value: number): string {
    return formatNumberValue(value, this.language.locale, '1.0-1');
  }
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function matches(text: string, needles: string[]): boolean {
  return needles.some((needle) => text.includes(needle));
}

function severityRank(priority: Priority): number {
  return priority === 'HIGH' ? 3 : priority === 'MEDIUM' ? 2 : 1;
}

function priorityRank(priority: Priority): number {
  return severityRank(priority);
}
