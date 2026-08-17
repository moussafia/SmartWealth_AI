import { WalletType } from './wallet.model';

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH';

export interface AllocationByType {
  type: WalletType;
  value: number;
  percentage: number;
}

export interface AllocationByAsset {
  symbol: string;
  name: string;
  value: number;
  percentage: number;
}

export interface ValueHistoryPoint {
  date: string;
  value: number;
}

export interface AssetPerformance {
  symbol: string;
  gainLoss: number;
  gainLossPercent: number;
}

/** Shape of `assets/data/portfolio-summary.json` — GET /api/portfolio/summary. */
export interface PortfolioSummary {
  userId: string;
  currency: string;
  totalValue: number;
  cashBalance: number;
  investedValue: number;
  costBasis: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  dayChange: number;
  dayChangePercent: number;
  walletCount: number;
  assetCount: number;
  riskScore: number;
  riskLevel: RiskLevel;
  updatedAt: string;
  allocationByType: AllocationByType[];
  allocationByAsset: AllocationByAsset[];
  valueHistory: ValueHistoryPoint[];
  assetPerformance: AssetPerformance[];
}

export interface RiskThresholds {
  singleAssetMaxPercent: number;
  cryptoMaxPercent: number;
  singlePositionRulePercent: number;
}

export interface AssetRisk {
  symbol: string;
  name: string;
  walletType: WalletType;
  value: number;
  weightPercent: number;
  volatilityPercent: number;
  riskLevel: RiskLevel;
  exceedsSingleAssetThreshold: boolean;
  exceedsSinglePositionRule: boolean;
}

/** Shape of `assets/data/portfolio-risk.json` — GET /api/portfolio/risk. */
export interface PortfolioRisk {
  userId: string;
  overallScore: number;
  level: RiskLevel;
  concentrationScore: number;
  volatilityScore: number;
  sharpeRatio: number;
  calculatedAt: string;
  thresholds: RiskThresholds;
  byAsset: AssetRisk[];
}
