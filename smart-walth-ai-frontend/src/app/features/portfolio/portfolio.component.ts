import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../core/services/language.service';
import { PortfolioService } from '../../core/services/portfolio.service';
import { formatDateTime, formatPercent, formatQuantity } from '../../core/util/format.util';
import {AddAssetFormValue, AddAssetRequest, CreateWalletRequest, WalletDto} from '../../core/models/wallet.model';
import { AmountComponent } from '../../shared/components/amount/amount.component';
import { CardComponent } from '../../shared/components/card/card.component';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import { DeltaChipComponent } from '../../shared/components/delta-chip/delta-chip.component';
import { MetricTileComponent } from '../../shared/components/metric-tile/metric-tile.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';
import { AssetFormComponent } from './asset-form/asset-form.component';
import { WalletFormComponent } from './wallet-form/wallet-form.component';

type Dialog =
  | { kind: 'none' }
  | { kind: 'wallet' }
  | { kind: 'asset'; walletId: string };

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
    WalletFormComponent,
    AssetFormComponent,
  ],
  templateUrl: './portfolio.component.html',
  styleUrl: './portfolio.component.scss',
})
export class PortfolioComponent implements OnInit {
  private readonly language = inject(LanguageService);
  private readonly portfolio = inject(PortfolioService);
  private readonly destroyRef = inject(DestroyRef);

  readonly wallets = this.portfolio.wallets;
  readonly summary = this.portfolio.summary;
  readonly loading = this.portfolio.loading;

  readonly dialog = signal<Dialog>({ kind: 'none' });
  readonly formError = signal('');

  private readonly selectedId = signal('');

  readonly selected = computed<WalletDto | null>(() => {
    const wallets = this.wallets();
    return wallets.find((w) => w.id === this.selectedId()) ?? wallets.at(0) ?? null;
  });

  ngOnInit(): void {
    this.portfolio.refresh();
  }

  selectWallet(event: Event): void {
    this.selectedId.set((event.target as HTMLSelectElement).value);
  }

  // --- Dialogs ---
  openWalletForm(): void {
    this.formError.set('');
    this.dialog.set({ kind: 'wallet' });
  }

  openAssetForm(walletId: string): void {
    this.formError.set('');
    this.dialog.set({ kind: 'asset', walletId });
  }

  close(): void {
    this.dialog.set({ kind: 'none' });
    this.formError.set('');
  }

  // --- Commands ---
  saveWallet(draft: CreateWalletRequest): void {
    this.portfolio
      .createWallet({ name: draft.name, type: draft.type, currency: draft.currency })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => {
          this.selectedId.set(created.id);
          this.close();
          this.portfolio.refresh();
        },
        error: (err: HttpErrorResponse) => this.formError.set(this.errorKey(err)),
      });
  }

  saveAsset(draft: AddAssetFormValue): void {
    this.portfolio
      .addAsset(draft.walletId, {
        symbol: draft.symbol,
        name: draft.name,
        quantity: draft.quantity,
        buyPrice: draft.buyPrice,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => { this.close(); this.portfolio.refresh(); },
        error: (err: HttpErrorResponse) => this.formError.set(this.errorKey(err)),
      });
  }

  private errorKey(err: HttpErrorResponse): string {
    if (err.status === 404) return 'error.notFound';
    if (err.status === 400) return 'error.invalidInput';
    if (err.status === 0) return 'error.network';
    return 'error.generic';
  }

  // --- Labels ---
  percent(value: number): string {
    return formatPercent(value, this.language.locale);
  }
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
