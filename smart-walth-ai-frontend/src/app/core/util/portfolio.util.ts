import { Asset, AssetPosition, Wallet, WalletDetail } from '../../models';

/** Valuation of a single holding: quantity × last known price (blueprint F2.3). */
export function toPosition(asset: Asset): AssetPosition {
  const price = asset.currentPrice ?? asset.avgBuyPrice;
  const marketValue = asset.quantity * price;
  const costBasis = asset.quantity * asset.avgBuyPrice;
  const gainLoss = marketValue - costBasis;

  return {
    ...asset,
    marketValue,
    costBasis,
    gainLoss,
    gainLossPercent: costBasis === 0 ? 0 : (gainLoss / costBasis) * 100,
  };
}

/** Joins wallets to their assets and rolls up cash + holdings into one total. */
export function toWalletDetails(wallets: Wallet[], assets: Asset[]): WalletDetail[] {
  return wallets.map((wallet) => {
    const positions = assets.filter((asset) => asset.walletId === wallet.id).map(toPosition);
    const investedValue = sum(positions.map((position) => position.marketValue));
    const costBasis = sum(positions.map((position) => position.costBasis));
    const gainLoss = investedValue - costBasis;

    return {
      ...wallet,
      positions,
      investedValue,
      totalValue: investedValue + wallet.balance,
      gainLoss,
      gainLossPercent: costBasis === 0 ? 0 : (gainLoss / costBasis) * 100,
    };
  });
}

export function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
