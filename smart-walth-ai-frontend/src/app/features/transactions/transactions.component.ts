import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../core/services/language.service';
import { PortfolioService } from '../../core/services/portfolio.service';
import { TransactionService } from '../../core/services/transaction.service';
import { formatDateTime, formatQuantity } from '../../core/util/format.util';
import { sum } from '../../core/util/portfolio.util';
import {
  Transaction,
  TransactionDraft,
  TransactionFilters,
  TransactionStatus,
  TransactionType,
} from '../../models';
import { AmountComponent } from '../../shared/components/amount/amount.component';
import { CardComponent } from '../../shared/components/card/card.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import { MetricTileComponent } from '../../shared/components/metric-tile/metric-tile.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';
import { transactionStatusTone, transactionTypeTone } from '../../shared/util/tone.util';
import { TransactionFormComponent } from './transaction-form/transaction-form.component';

const EMPTY_FILTERS: TransactionFilters = {
  type: 'ALL',
  status: 'ALL',
  walletId: 'ALL',
  from: null,
  to: null,
  minAmount: null,
  maxAmount: null,
  anomaliesOnly: false,
};

/** Sortable columns of the history table. */
export type SortKey = 'createdAt' | 'type' | 'amount' | 'status';
type SortDirection = 'asc' | 'desc';

/** Blueprint F3: submit transactions and browse the filterable history. */
@Component({
  selector: 'app-transactions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslatePipe,
    PageHeaderComponent,
    CardComponent,
    MetricTileComponent,
    DataTableComponent,
    AmountComponent,
    StatusChipComponent,
    TransactionFormComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: './transactions.component.html',
  styleUrl: './transactions.component.scss',
})
export class TransactionsComponent {
  private readonly language = inject(LanguageService);
  private readonly transactions = inject(TransactionService);
  private readonly portfolio = inject(PortfolioService);

  readonly all = this.transactions.all;
  readonly wallets = this.portfolio.wallets;
  readonly currency = this.portfolio.currency;

  readonly filters = signal<TransactionFilters>(EMPTY_FILTERS);
  readonly search = signal('');
  readonly sortKey = signal<SortKey>('createdAt');
  readonly sortDirection = signal<SortDirection>('desc');

  readonly composerOpen = signal(false);
  readonly pendingDelete = signal<Transaction | null>(null);
  readonly formError = signal('');

  readonly types: readonly TransactionType[] = ['DEPOSIT', 'WITHDRAW', 'BUY', 'SELL'];
  readonly statuses: readonly TransactionStatus[] = ['PENDING', 'PROCESSING', 'DONE', 'FAIL'];

  readonly statusTone = transactionStatusTone;
  readonly typeTone = transactionTypeTone;

  /** Blueprint F3.3 — type, status, wallet, date range, amount range and anomalies. */
  private readonly matching = computed(() => {
    const f = this.filters();
    const needle = this.search().trim().toLowerCase();

    return this.all().filter((tx) => {
      if (f.type !== 'ALL' && tx.type !== f.type) return false;
      if (f.status !== 'ALL' && tx.status !== f.status) return false;
      if (f.walletId !== 'ALL' && tx.walletId !== f.walletId) return false;
      if (f.anomaliesOnly && !tx.isAnomaly) return false;
      if (f.from && tx.createdAt.slice(0, 10) < f.from) return false;
      if (f.to && tx.createdAt.slice(0, 10) > f.to) return false;
      if (f.minAmount !== null && tx.amount < f.minAmount) return false;
      if (f.maxAmount !== null && tx.amount > f.maxAmount) return false;

      if (needle) {
        const haystack = [
          tx.assetSymbol ?? '',
          tx.description ?? '',
          this.walletName(tx.walletId),
          this.language.instant(`txType.${tx.type}`),
          this.language.instant(`txStatus.${tx.status}`),
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }

      return true;
    });
  });

  readonly filtered = computed(() => {
    const key = this.sortKey();
    const factor = this.sortDirection() === 'asc' ? 1 : -1;

    return [...this.matching()].sort((a, b) => factor * this.compare(a, b, key));
  });

  readonly activeFilterCount = computed(() => {
    const f = this.filters();
    let count = 0;
    if (f.type !== 'ALL') count++;
    if (f.status !== 'ALL') count++;
    if (f.walletId !== 'ALL') count++;
    if (f.from) count++;
    if (f.to) count++;
    if (f.minAmount !== null) count++;
    if (f.maxAmount !== null) count++;
    if (f.anomaliesOnly) count++;
    if (this.search().trim()) count++;
    return count;
  });

  readonly totalVolume = computed(() => sum(this.filtered().map((tx) => tx.amount)));
  readonly anomalyCount = computed(() => this.filtered().filter((tx) => tx.isAnomaly).length);
  readonly failedCount = computed(
    () => this.filtered().filter((tx) => tx.status === 'FAIL').length,
  );
  readonly pendingCount = computed(
    () =>
      this.filtered().filter((tx) => tx.status === 'PENDING' || tx.status === 'PROCESSING').length,
  );

  // --- Filters, search and sorting ---------------------------------------

  patch(change: Partial<TransactionFilters>): void {
    this.filters.update((current) => ({ ...current, ...change }));
  }

  reset(): void {
    this.filters.set(EMPTY_FILTERS);
    this.search.set('');
  }

  /** Clicking the active column flips direction; a new column starts descending. */
  sortBy(key: SortKey): void {
    if (this.sortKey() === key) {
      this.sortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
      return;
    }
    this.sortKey.set(key);
    this.sortDirection.set('desc');
  }

  sortIndicator(key: SortKey): string {
    if (this.sortKey() !== key) return '';
    return this.sortDirection() === 'asc' ? '▲' : '▼';
  }

  ariaSort(key: SortKey): 'ascending' | 'descending' | 'none' {
    if (this.sortKey() !== key) return 'none';
    return this.sortDirection() === 'asc' ? 'ascending' : 'descending';
  }

  // --- Commands -----------------------------------------------------------

  openComposer(): void {
    this.formError.set('');
    this.composerOpen.set(true);
  }

  closeComposer(): void {
    this.composerOpen.set(false);
    this.formError.set('');
  }

  submit(draft: TransactionDraft): void {
    const result = this.transactions.create(draft);
    if (result.ok) {
      this.closeComposer();
      return;
    }
    this.formError.set(result.errorKey ?? 'error.generic');
  }

  retry(id: string): void {
    this.transactions.retry(id);
  }

  cancel(id: string): void {
    this.transactions.cancel(id);
  }

  confirmDelete(transaction: Transaction): void {
    this.pendingDelete.set(transaction);
  }

  cancelDelete(): void {
    this.pendingDelete.set(null);
  }

  deleteConfirmed(): void {
    const target = this.pendingDelete();
    if (!target) return;
    this.transactions.remove(target.id);
    this.pendingDelete.set(null);
  }

  isSettled(transaction: Transaction): boolean {
    return transaction.status === 'DONE';
  }

  isOpen(transaction: Transaction): boolean {
    return transaction.status === 'PENDING' || transaction.status === 'PROCESSING';
  }

  deleteDetailKey(): string {
    const target = this.pendingDelete();
    return target && this.isSettled(target)
      ? 'transactions.deleteReverses'
      : 'transactions.deleteDetail';
  }

  // --- Input helpers ------------------------------------------------------

  onText(event: Event): string | null {
    const value = (event.target as HTMLInputElement).value;
    return value === '' ? null : value;
  }

  onNumber(event: Event): number | null {
    const value = (event.target as HTMLInputElement).value;
    return value === '' ? null : Number(value);
  }

  onSelect(event: Event): string {
    return (event.target as HTMLSelectElement).value;
  }

  onCheckbox(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }

  onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  walletName(walletId: string): string {
    return this.portfolio.walletName(walletId);
  }

  quantity(value: number): string {
    return formatQuantity(value, this.language.locale);
  }

  when(value: string): string {
    return formatDateTime(value, this.language.locale);
  }

  private compare(a: Transaction, b: Transaction, key: SortKey): number {
    switch (key) {
      case 'amount':
        return a.amount - b.amount;
      case 'type':
        return a.type.localeCompare(b.type);
      case 'status':
        return a.status.localeCompare(b.status);
      case 'createdAt':
        return a.createdAt.localeCompare(b.createdAt);
    }
  }
}
