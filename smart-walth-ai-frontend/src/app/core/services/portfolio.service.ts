import { Injectable, computed, inject } from '@angular/core';
import {
  Asset,
  AssetDraft,
  CommandResult,
  OK,
  Wallet,
  WalletDraft,
  created,
  fail,
} from '../../models';
import { AppStateService } from '../state/app-state.service';
import { newId, nowIso } from '../util/id.util';
import { LanguageService } from './language.service';

/**
 * Blueprint F2 — wallets, holdings and valuation.
 *
 * Reads are signals derived from {@link AppStateService}; writes mutate that
 * in-memory state, which makes the summary and risk score recompute on their own.
 */
@Injectable({ providedIn: 'root' })
export class PortfolioService {
  private readonly state = inject(AppStateService);
  private readonly language = inject(LanguageService);

  readonly summary = this.state.summary;
  readonly risk = this.state.risk;
  readonly wallets = this.state.wallets;
  readonly assets = this.state.assets;
  readonly walletDetails = this.state.walletDetails;
  readonly currency = this.state.currency;

  readonly walletCount = computed(() => this.wallets().length);

  wallet(id: string): Wallet | undefined {
    return this.wallets().find((wallet) => wallet.id === id);
  }

  walletName(id: string): string {
    return this.wallet(id)?.name ?? '';
  }

  asset(id: string): Asset | undefined {
    return this.assets().find((asset) => asset.id === id);
  }

  /** Holdings of a wallet, used to warn before a cascading delete. */
  assetsOf(walletId: string): Asset[] {
    return this.assets().filter((asset) => asset.walletId === walletId);
  }

  // --- F2.1 wallets -------------------------------------------------------

  createWallet(draft: WalletDraft): CommandResult {
    if (this.isNameTaken(draft.name, null)) {
      return fail('error.walletNameTaken');
    }

    const wallet: Wallet = {
      id: newId(),
      userId: this.state.userId(),
      name: draft.name.trim(),
      type: draft.type,
      balance: draft.balance,
      currency: draft.currency,
      createdAt: nowIso(),
    };

    this.state.setWallets([...this.wallets(), wallet]);
    this.publishPortfolioEvent('event.walletCreated', { name: wallet.name });
    return created(wallet.id);
  }

  updateWallet(id: string, draft: WalletDraft): CommandResult {
    if (this.isNameTaken(draft.name, id)) {
      return fail('error.walletNameTaken');
    }

    this.state.setWallets(
      this.wallets().map((wallet) =>
        wallet.id === id
          ? {
              ...wallet,
              name: draft.name.trim(),
              type: draft.type,
              balance: draft.balance,
              currency: draft.currency,
            }
          : wallet,
      ),
    );
    this.publishPortfolioEvent('event.walletUpdated', { name: draft.name.trim() });
    return OK;
  }

  /** Removes a wallet together with its holdings, since assets are wallet-scoped. */
  deleteWallet(id: string): CommandResult {
    const wallet = this.wallet(id);
    if (!wallet) return fail('error.walletMissing');

    this.state.setWallets(this.wallets().filter((entry) => entry.id !== id));
    this.state.setAssets(this.assets().filter((asset) => asset.walletId !== id));
    this.publishPortfolioEvent('event.walletDeleted', { name: wallet.name });
    return OK;
  }

  // --- F2.2 assets --------------------------------------------------------

  createAsset(draft: AssetDraft): CommandResult {
    if (!this.wallet(draft.walletId)) return fail('error.walletMissing');

    const symbol = draft.symbol.trim().toUpperCase();
    if (this.assetsOf(draft.walletId).some((asset) => asset.symbol === symbol)) {
      return fail('error.assetExists');
    }

    const asset: Asset = {
      id: newId(),
      walletId: draft.walletId,
      symbol,
      name: draft.name.trim(),
      quantity: draft.quantity,
      avgBuyPrice: draft.avgBuyPrice,
      currentPrice: draft.currentPrice,
      lastUpdated: draft.currentPrice === null ? null : nowIso(),
    };

    this.state.setAssets([...this.assets(), asset]);
    this.publishPortfolioEvent('event.assetAdded', { symbol });
    return OK;
  }

  updateAsset(id: string, draft: AssetDraft): CommandResult {
    const existing = this.asset(id);
    if (!existing) return fail('error.assetMissing');

    const symbol = draft.symbol.trim().toUpperCase();
    const clash = this.assetsOf(draft.walletId).some(
      (asset) => asset.id !== id && asset.symbol === symbol,
    );
    if (clash) return fail('error.assetExists');

    this.state.setAssets(
      this.assets().map((asset) =>
        asset.id === id
          ? {
              ...asset,
              walletId: draft.walletId,
              symbol,
              name: draft.name.trim(),
              quantity: draft.quantity,
              avgBuyPrice: draft.avgBuyPrice,
              currentPrice: draft.currentPrice,
              lastUpdated: draft.currentPrice === null ? asset.lastUpdated : nowIso(),
            }
          : asset,
      ),
    );
    this.publishPortfolioEvent('event.assetUpdated', { symbol });
    return OK;
  }

  deleteAsset(id: string): CommandResult {
    const asset = this.asset(id);
    if (!asset) return fail('error.assetMissing');

    this.state.setAssets(this.assets().filter((entry) => entry.id !== id));
    this.publishPortfolioEvent('event.assetRemoved', { symbol: asset.symbol });
    return OK;
  }

  /**
   * Blueprint F2.3 — stands in for the market-data poll: nudges every quoted
   * price within a small band so the valuation visibly re-derives.
   */
  refreshPrices(): CommandResult {
    const assets = this.assets();
    if (assets.length === 0) return fail('error.noAssets');

    const stamp = nowIso();
    this.state.setAssets(
      assets.map((asset) => {
        const base = asset.currentPrice ?? asset.avgBuyPrice;
        const drift = (Math.random() - 0.5) * 0.04;
        return {
          ...asset,
          currentPrice: Math.max(0.01, Math.round(base * (1 + drift) * 100) / 100),
          lastUpdated: stamp,
        };
      }),
    );

    this.publishPortfolioEvent('event.pricesRefreshed', { count: assets.length });
    return OK;
  }

  // --- Cash and holdings movements used by the transaction flow -----------

  adjustBalance(walletId: string, delta: number): void {
    this.state.setWallets(
      this.wallets().map((wallet) =>
        wallet.id === walletId
          ? { ...wallet, balance: round(wallet.balance + delta) }
          : wallet,
      ),
    );
  }

  /** Adds to a holding at a weighted average cost, creating it when absent. */
  addHolding(
    walletId: string,
    symbol: string,
    name: string,
    quantity: number,
    unitPrice: number,
  ): void {
    const existing = this.assetsOf(walletId).find((asset) => asset.symbol === symbol);

    if (!existing) {
      const asset: Asset = {
        id: newId(),
        walletId,
        symbol,
        name: name || symbol,
        quantity,
        avgBuyPrice: unitPrice,
        currentPrice: unitPrice,
        lastUpdated: nowIso(),
      };
      this.state.setAssets([...this.assets(), asset]);
      return;
    }

    const totalQuantity = existing.quantity + quantity;
    const avgBuyPrice =
      totalQuantity === 0
        ? unitPrice
        : round((existing.quantity * existing.avgBuyPrice + quantity * unitPrice) / totalQuantity);

    this.state.setAssets(
      this.assets().map((asset) =>
        asset.id === existing.id
          ? {
              ...asset,
              quantity: roundQuantity(totalQuantity),
              avgBuyPrice,
              currentPrice: unitPrice,
              lastUpdated: nowIso(),
            }
          : asset,
      ),
    );
  }

  /** Reduces a holding, dropping the line entirely once fully sold. */
  reduceHolding(walletId: string, symbol: string, quantity: number, unitPrice: number): void {
    const existing = this.assetsOf(walletId).find((asset) => asset.symbol === symbol);
    if (!existing) return;

    const remaining = roundQuantity(existing.quantity - quantity);

    if (remaining <= 0) {
      this.state.setAssets(this.assets().filter((asset) => asset.id !== existing.id));
      return;
    }

    this.state.setAssets(
      this.assets().map((asset) =>
        asset.id === existing.id
          ? { ...asset, quantity: remaining, currentPrice: unitPrice, lastUpdated: nowIso() }
          : asset,
      ),
    );
  }

  holding(walletId: string, symbol: string): Asset | undefined {
    return this.assetsOf(walletId).find((asset) => asset.symbol === symbol);
  }

  private isNameTaken(name: string, exceptId: string | null): boolean {
    const needle = name.trim().toLowerCase();
    return this.wallets().some(
      (wallet) => wallet.id !== exceptId && wallet.name.trim().toLowerCase() === needle,
    );
  }

  private publishPortfolioEvent(key: string, params: Record<string, unknown>): void {
    this.state.publish({
      eventType: 'PORTFOLIO_UPDATED',
      topic: 'portfolio-events',
      severity: 'INFO',
      title: this.language.instant('event.portfolioTitle'),
      message: this.language.instant(key, params),
    });
  }
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundQuantity(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}
