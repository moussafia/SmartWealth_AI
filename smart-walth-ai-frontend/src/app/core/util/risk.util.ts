import {
  AllocationByAsset,
  AllocationByType,
  AssetPerformance,
  AssetRisk,
  PortfolioRisk,
  PortfolioSummary,
  RiskLevel,
  RiskThresholds,
  ValueHistoryPoint,
  WalletDetail,
  WalletType,
} from '../../models';
import { sum } from './portfolio.util';

/**
 * Stand-in for the market-data feed the real Portfolio Service would call: any
 * symbol absent from the seeded risk fixture falls back to a per-class figure.
 */
const DEFAULT_VOLATILITY_BY_TYPE: Record<WalletType, number> = {
  STOCKS: 25,
  SAVINGS: 2,
  CRYPTO: 60,
};

/** Annual return assumed risk-free, used by the simplified Sharpe ratio. */
const RISK_FREE_PERCENT = 2;

/** Scales a raw percentage onto the 0–100 score axis used by both sub-scores. */
const SCORE_SCALE = 1.8;

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function levelFromScore(score: number): RiskLevel {
  if (score >= 70) return 'HIGH';
  if (score >= 40) return 'MODERATE';
  return 'LOW';
}

export function levelFromVolatility(volatilityPercent: number): RiskLevel {
  if (volatilityPercent >= 45) return 'HIGH';
  if (volatilityPercent >= 20) return 'MODERATE';
  return 'LOW';
}

/** Everything the derivations need from the seeded fixtures but cannot compute. */
export interface RiskSeed {
  thresholds: RiskThresholds;
  /** Per-symbol annualised volatility, keyed by ticker. */
  volatilityBySymbol: Record<string, number>;
}

export function volatilityFor(seed: RiskSeed, symbol: string, walletType: WalletType): number {
  return seed.volatilityBySymbol[symbol] ?? DEFAULT_VOLATILITY_BY_TYPE[walletType];
}

/**
 * Blueprint F2.4 — recomputes the risk score from the live holdings.
 *
 * - `concentrationScore` tracks the heaviest single position as a share of total wealth.
 * - `volatilityScore` is the value-weighted volatility of the invested book (cash excluded,
 *   since idle balances carry no market risk).
 * - `overallScore` blends the two, weighted towards volatility.
 */
export function deriveRisk(
  userId: string,
  wallets: WalletDetail[],
  seed: RiskSeed,
  calculatedAt: string,
): PortfolioRisk {
  const totalValue = sum(wallets.map((wallet) => wallet.totalValue));
  const investedValue = sum(wallets.map((wallet) => wallet.investedValue));
  const costBasis = sum(wallets.flatMap((wallet) => wallet.positions.map((p) => p.costBasis)));

  const byAsset: AssetRisk[] = wallets
    .flatMap((wallet) =>
      wallet.positions.map((position) => {
        const volatilityPercent = volatilityFor(seed, position.symbol, wallet.type);
        const weightPercent = totalValue === 0 ? 0 : (position.marketValue / totalValue) * 100;

        return {
          symbol: position.symbol,
          name: position.name,
          walletType: wallet.type,
          value: round(position.marketValue),
          weightPercent: round(weightPercent),
          volatilityPercent,
          riskLevel: levelFromVolatility(volatilityPercent),
          exceedsSingleAssetThreshold: weightPercent > seed.thresholds.singleAssetMaxPercent,
          exceedsSinglePositionRule: weightPercent > seed.thresholds.singlePositionRulePercent,
        };
      }),
    )
    .sort((a, b) => b.value - a.value);

  const maxWeight = byAsset.length === 0 ? 0 : Math.max(...byAsset.map((a) => a.weightPercent));
  const concentrationScore = clampScore(maxWeight * SCORE_SCALE);

  const investedVolatility =
    investedValue === 0
      ? 0
      : sum(
          wallets.flatMap((wallet) =>
            wallet.positions.map(
              (position) =>
                position.marketValue * volatilityFor(seed, position.symbol, wallet.type),
            ),
          ),
        ) / investedValue;

  const volatilityScore = clampScore(investedVolatility * SCORE_SCALE);
  const overallScore = clampScore(0.4 * concentrationScore + 0.6 * volatilityScore);

  const returnPercent = costBasis === 0 ? 0 : ((investedValue - costBasis) / costBasis) * 100;
  const sharpeRatio =
    investedVolatility === 0 ? 0 : round((returnPercent - RISK_FREE_PERCENT) / investedVolatility);

  return {
    userId,
    overallScore,
    level: levelFromScore(overallScore),
    concentrationScore,
    volatilityScore,
    sharpeRatio,
    calculatedAt,
    thresholds: seed.thresholds,
    byAsset,
  };
}

/** Everything the summary needs from the seeded fixture but cannot compute. */
export interface SummarySeed {
  currency: string;
  /** Session price move, which user actions must not alter. */
  dayChange: number;
  dayChangePercent: number;
  /** Twelve-month valuation series; its final point tracks the live total. */
  valueHistory: ValueHistoryPoint[];
}

/** Blueprint F2.3 / F5.1 — rolls the live holdings up into the dashboard summary. */
export function deriveSummary(
  userId: string,
  wallets: WalletDetail[],
  seed: SummarySeed,
  risk: PortfolioRisk,
  updatedAt: string,
): PortfolioSummary {
  const positions = wallets.flatMap((wallet) => wallet.positions);
  const cashBalance = sum(wallets.map((wallet) => wallet.balance));
  const investedValue = sum(positions.map((position) => position.marketValue));
  const costBasis = sum(positions.map((position) => position.costBasis));
  const totalValue = cashBalance + investedValue;
  const totalGainLoss = investedValue - costBasis;

  const allocationByType: AllocationByType[] = (['STOCKS', 'SAVINGS', 'CRYPTO'] as WalletType[])
    .map((type) => {
      const value = sum(
        wallets.filter((wallet) => wallet.type === type).map((wallet) => wallet.totalValue),
      );
      return {
        type,
        value: round(value),
        percentage: totalValue === 0 ? 0 : round((value / totalValue) * 100),
      };
    })
    .filter((slice) => slice.value > 0);

  const bySymbol = new Map<string, AllocationByAsset & { costBasis: number }>();
  for (const position of positions) {
    const existing = bySymbol.get(position.symbol);
    if (existing) {
      existing.value += position.marketValue;
      existing.costBasis += position.costBasis;
    } else {
      bySymbol.set(position.symbol, {
        symbol: position.symbol,
        name: position.name,
        value: position.marketValue,
        percentage: 0,
        costBasis: position.costBasis,
      });
    }
  }

  const aggregated = [...bySymbol.values()].sort((a, b) => b.value - a.value);

  const allocationByAsset: AllocationByAsset[] = aggregated.map((entry) => ({
    symbol: entry.symbol,
    name: entry.name,
    value: round(entry.value),
    percentage: totalValue === 0 ? 0 : round((entry.value / totalValue) * 100),
  }));

  const assetPerformance: AssetPerformance[] = aggregated.map((entry) => {
    const gainLoss = entry.value - entry.costBasis;
    return {
      symbol: entry.symbol,
      gainLoss: round(gainLoss),
      gainLossPercent: entry.costBasis === 0 ? 0 : round((gainLoss / entry.costBasis) * 100),
    };
  });

  const valueHistory = seed.valueHistory.map((point, index) =>
    index === seed.valueHistory.length - 1 ? { ...point, value: round(totalValue) } : point,
  );

  return {
    userId,
    currency: seed.currency,
    totalValue: round(totalValue),
    cashBalance: round(cashBalance),
    investedValue: round(investedValue),
    costBasis: round(costBasis),
    totalGainLoss: round(totalGainLoss),
    totalGainLossPercent: costBasis === 0 ? 0 : round((totalGainLoss / costBasis) * 100),
    dayChange: seed.dayChange,
    dayChangePercent: seed.dayChangePercent,
    walletCount: wallets.length,
    assetCount: positions.length,
    riskScore: risk.overallScore,
    riskLevel: risk.level,
    updatedAt,
    allocationByType,
    allocationByAsset,
    valueHistory,
    assetPerformance,
  };
}
