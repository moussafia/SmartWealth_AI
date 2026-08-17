export type WalletType = 'STOCKS' | 'SAVINGS' | 'CRYPTO';

/** Shape of `assets/data/wallets.json` — mirrors the Portfolio Service `wallets` table. */
export interface Wallet {
  id: string;
  userId: string;
  name: string;
  type: WalletType;
  balance: number;
  currency: string;
  createdAt: string;
}

/** Shape of `assets/data/assets.json` — mirrors the Portfolio Service `assets` table. */
export interface Asset {
  id: string;
  walletId: string;
  symbol: string;
  name: string;
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number | null;
  lastUpdated: string | null;
}

/** Derived view model: an asset with its computed valuation figures. */
export interface AssetPosition extends Asset {
  marketValue: number;
  costBasis: number;
  gainLoss: number;
  gainLossPercent: number;
}

/** Derived view model: a wallet with its positions and totals. */
export interface WalletDetail extends Wallet {
  positions: AssetPosition[];
  investedValue: number;
  totalValue: number;
  gainLoss: number;
  gainLossPercent: number;
}
