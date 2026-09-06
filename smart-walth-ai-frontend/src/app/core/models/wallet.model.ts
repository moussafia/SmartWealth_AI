export type WalletType = 'CRYPTO' | 'STOCKS' | 'SAVINGS';
export type AssetType = 'CRYPTO' | 'STOCK';

export interface AssetDto {
  id: string;
  symbol: string;
  name: string;
  assetType: AssetType;
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  totalValue: number;
  profitLoss: number;
  profitLossPercentage: number;
}

export interface WalletDto {
  id: string;
  name: string;
  type: WalletType;
  currency: string;
  balance: number;
  totalValue: number;
  assetCount: number;
  assets: AssetDto[];
  createdAt: string;
}

export interface PortfolioSummaryDto {
  userId: string;
  totalWallets: number;
  totalAssets: number;
  totalPortfolioValue: number;
  totalProfitLoss: number;
  wallets: WalletDto[];
}

export interface CreateWalletRequest {
  name: string;
  type: WalletType;
  currency: string;
}

export interface AddAssetRequest {
  symbol: string;
  name: string;
  quantity: number;
  buyPrice: number;
}

export interface AddAssetFormValue {
  walletId: string;
  symbol: string;
  name: string;
  quantity: number;
  buyPrice: number;
}
