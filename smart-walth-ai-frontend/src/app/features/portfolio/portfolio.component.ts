import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../core/services/language.service';
import { PortfolioService } from '../../core/services/portfolio.service';
import { formatDateTime, formatPercent, formatQuantity } from '../../core/util/format.util';
import {
  Asset,
  AssetDraft,
  CommandResult,
  Wallet,
  WalletDetail,
  WalletDraft,
} from '../../models';
import { AmountComponent } from '../../shared/components/amount/amount.component';
import { CardComponent } from '../../shared/components/card/card.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import { DeltaChipComponent } from '../../shared/components/delta-chip/delta-chip.component';
import { MetricTileComponent } from '../../shared/components/metric-tile/metric-tile.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ScoreBarComponent } from '../../shared/components/score-bar/score-bar.component';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';
import { riskLevelTone } from '../../shared/util/tone.util';
import { AssetFormComponent } from './asset-form/asset-form.component';
import { WalletFormComponent } from './wallet-form/wallet-form.component';

/** Which dialog, if any, is currently open. */
type Dialog =
  | { kind: 'none' }
  | { kind: 'wallet'; wallet: Wallet | null }
  | { kind: 'asset'; asset: Asset | null; walletId: string }
  | { kind: 'deleteWallet'; wallet: Wallet }
  | { kind: 'deleteAsset'; asset: Asset };

/** Blueprint F2: wallets by type, holdings, live valuation and risk scoring. */
@Component({
  selector: 'app-portfolio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslatePipe,
    PageHeaderComponent,
    CardComponent,
    MetricTileComponent,
    DataTableComponent,
    AmountComponent,
    DeltaChipComponent,
    StatusChipComponent,
    ScoreBarComponent,
    WalletFormComponent,
    AssetFormComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: './portfolio.component.html',
  styleUrl: './portfolio.component.scss',
})
export class PortfolioComponent {
  private readonly language = inject(LanguageService);
  private readonly portfolio = inject(PortfolioService);

  readonly summary = this.portfolio.summary;
  readonly risk = this.portfolio.risk;
  readonly wallets = this.portfolio.walletDetails;
  readonly plainWallets = this.portfolio.wallets;

  readonly riskLevelTone = riskLevelTone;

  readonly dialog = signal<Dialog>({ kind: 'none' });
  /** Failure key returned by the last command, shown inside the open form. */
  readonly formError = signal('');

  /** Wallet chosen in the switcher; empty until the user picks one. */
  private readonly selectedId = signal('');

  /**
   * The wallet on screen. Falls back to the first one, so an empty or stale
   * selection — after deleting the wallet being viewed — still renders.
   */
  readonly selected = computed<WalletDetail | null>(() => {
    const wallets = this.wallets();
    return wallets.find((wallet) => wallet.id === this.selectedId()) ?? wallets.at(0) ?? null;
  });

  readonly riskTone = computed(() => {
    const score = this.risk().overallScore;
    if (score >= 70) return 'negative' as const;
    if (score >= 40) return 'warning' as const;
    return 'positive' as const;
  });

  selectWallet(event: Event): void {
    this.selectedId.set((event.target as HTMLSelectElement).value);
  }

  // --- Dialog plumbing ----------------------------------------------------

  openWalletForm(wallet: Wallet | null): void {
    this.formError.set('');
    this.dialog.set({ kind: 'wallet', wallet });
  }

  openAssetForm(walletId: string, asset: Asset | null): void {
    this.formError.set('');
    this.dialog.set({ kind: 'asset', asset, walletId });
  }

  confirmWalletDelete(wallet: Wallet): void {
    this.dialog.set({ kind: 'deleteWallet', wallet });
  }

  confirmAssetDelete(asset: Asset): void {
    this.dialog.set({ kind: 'deleteAsset', asset });
  }

  close(): void {
    this.dialog.set({ kind: 'none' });
    this.formError.set('');
  }

  // --- Commands -----------------------------------------------------------

  saveWallet(draft: WalletDraft): void {
    const current = this.dialog();
    if (current.kind !== 'wallet') return;

    const result = current.wallet
      ? this.portfolio.updateWallet(current.wallet.id, draft)
      : this.portfolio.createWallet(draft);

    // Only one wallet shows at a time, so bring a freshly created one on screen.
    if (result.id) this.selectedId.set(result.id);
    this.handle(result);
  }

  saveAsset(draft: AssetDraft): void {
    const current = this.dialog();
    if (current.kind !== 'asset') return;

    this.handle(
      current.asset
        ? this.portfolio.updateAsset(current.asset.id, draft)
        : this.portfolio.createAsset(draft),
    );
  }

  deleteWallet(): void {
    const current = this.dialog();
    if (current.kind !== 'deleteWallet') return;
    this.handle(this.portfolio.deleteWallet(current.wallet.id));
  }

  deleteAsset(): void {
    const current = this.dialog();
    if (current.kind !== 'deleteAsset') return;
    this.handle(this.portfolio.deleteAsset(current.asset.id));
  }

  refreshPrices(): void {
    this.portfolio.refreshPrices();
  }

  /** Closes the dialog on success, or surfaces the reason it was refused. */
  private handle(result: CommandResult): void {
    if (result.ok) {
      this.close();
      return;
    }
    this.formError.set(result.errorKey ?? 'error.generic');
  }

  // --- Labels -------------------------------------------------------------

  holdingCount(walletId: string): number {
    return this.portfolio.assetsOf(walletId).length;
  }

  deleteWalletDetail(wallet: Wallet): string {
    const count = this.holdingCount(wallet.id);
    return count === 0
      ? this.language.instant('portfolio.deleteWalletEmpty')
      : this.language.instant('portfolio.deleteWalletHoldings', { count });
  }

  percent(value: number): string {
    return formatPercent(value, this.language.locale);
  }

  /** Fixed 2 decimals so table columns stay vertically aligned. */
  percentPrecise(value: number): string {
    return formatPercent(value, this.language.locale, '1.2-2');
  }

  quantity(value: number): string {
    return formatQuantity(value, this.language.locale);
  }

  when(value: string): string {
    return formatDateTime(value, this.language.locale);
  }
}
