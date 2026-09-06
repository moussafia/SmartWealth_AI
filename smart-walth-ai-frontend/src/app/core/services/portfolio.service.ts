import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { environment } from '../../../environments/environment';
import {
  AddAssetRequest,
  CreateWalletRequest,
  PortfolioSummaryDto,
  WalletDto,
} from '../models/wallet.model';

@Injectable({ providedIn: 'root' })
export class PortfolioService {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly baseUrl = environment.apiUrl;

  readonly wallets = signal<WalletDto[]>([]);
  readonly summary = signal<PortfolioSummaryDto | null>(null);
  readonly loading = signal(false);

  refresh(): void {
    this.loading.set(true);

    this.http.get<WalletDto[]>(`${this.baseUrl}/wallets`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => this.wallets.set(list),
        complete: () => this.loading.set(false),
        error: () => this.loading.set(false),
      });

    this.http.get<PortfolioSummaryDto>(`${this.baseUrl}/portfolios/summary`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (s) => this.summary.set(s) });
  }

  createWallet(body: CreateWalletRequest) {
    return this.http.post<WalletDto>(`${this.baseUrl}/wallets`, body);
  }

  addAsset(walletId: string, body: AddAssetRequest) {
    return this.http.post<WalletDto>(`${this.baseUrl}/wallets/${walletId}/assets`, body);
  }
}
