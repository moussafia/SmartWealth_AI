import { Injectable, computed, inject } from '@angular/core';
import {
  CommandResult,
  OK,
  Transaction,
  TransactionDraft,
  TransactionStatus,
  fail,
} from '../../models';
import { AppStateService } from '../state/app-state.service';
import { newId, nowIso } from '../util/id.util';
import { AdvisorEngineService } from './advisor-engine.service';
import { LanguageService } from './language.service';
import { PortfolioService } from './portfolio.service';

/** Delays that let the PENDING → PROCESSING → DONE progression be observable. */
const PROCESSING_DELAY_MS = 700;
const COMPLETION_DELAY_MS = 900;

/**
 * Blueprint F3 — deposits, withdrawals and asset trades.
 *
 * A submitted transaction lands as PENDING and then advances on a timer, which
 * is how the real service behaves once the Kafka consumer picks the event up.
 * The portfolio is only touched at completion, mirroring F3.2's asynchronous
 * portfolio update.
 */
@Injectable({ providedIn: 'root' })
export class TransactionService {
  private readonly state = inject(AppStateService);
  private readonly portfolio = inject(PortfolioService);
  private readonly advisor = inject(AdvisorEngineService);
  private readonly language = inject(LanguageService);

  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  readonly all = this.state.transactions;

  readonly pendingCount = computed(
    () => this.all().filter((tx) => tx.status === 'PENDING' || tx.status === 'PROCESSING').length,
  );

  readonly failed = computed(() => this.all().filter((tx) => tx.status === 'FAIL'));

  /** Quantity of a symbol available to sell from a given wallet. */
  availableQuantity(walletId: string, symbol: string): number {
    return this.portfolio.holding(walletId, symbol.toUpperCase())?.quantity ?? 0;
  }

  /**
   * Validates a draft against the wallet's cash and holdings. Returned as a
   * translation key so the composer can show the reason inline.
   */
  validate(draft: TransactionDraft): CommandResult {
    const wallet = this.portfolio.wallet(draft.walletId);
    if (!wallet) return fail('error.walletMissing');
    if (draft.amount <= 0) return fail('error.amountPositive');

    if (draft.type === 'WITHDRAW' && draft.amount > wallet.balance) {
      return fail('error.insufficientFunds');
    }

    if (draft.type === 'BUY') {
      if (!draft.assetSymbol) return fail('error.symbolRequired');
      if (!draft.quantity || draft.quantity <= 0) return fail('error.quantityPositive');
      if (draft.amount > wallet.balance) return fail('error.insufficientFunds');
    }

    if (draft.type === 'SELL') {
      if (!draft.assetSymbol) return fail('error.symbolRequired');
      if (!draft.quantity || draft.quantity <= 0) return fail('error.quantityPositive');
      if (draft.quantity > this.availableQuantity(draft.walletId, draft.assetSymbol)) {
        return fail('error.insufficientHolding');
      }
    }

    return OK;
  }

  /** Blueprint F3.1 / F3.2 — submits a transaction and starts its lifecycle. */
  create(draft: TransactionDraft): CommandResult {
    const validation = this.validate(draft);
    if (!validation.ok) return validation;

    const isAnomaly = draft.amount > this.advisor.anomalyThreshold(draft.type);

    const transaction: Transaction = {
      id: newId(),
      userId: this.state.userId(),
      walletId: draft.walletId,
      type: draft.type,
      amount: draft.amount,
      assetSymbol: draft.assetSymbol ? draft.assetSymbol.toUpperCase() : null,
      quantity: draft.quantity,
      status: 'PENDING',
      isAnomaly,
      description: draft.description?.trim() ? draft.description.trim() : null,
      createdAt: nowIso(),
      completedAt: null,
    };

    this.state.setTransactions([transaction, ...this.all()]);
    this.schedule(transaction.id, draft);

    if (isAnomaly) {
      this.state.publish({
        eventType: 'ANOMALY_DETECTED',
        topic: 'alert-events',
        severity: 'WARNING',
        title: this.language.instant('event.anomalyTitle'),
        message: this.language.instant('event.anomalyMessage', {
          type: this.language.instant(`txType.${transaction.type}`).toLowerCase(),
        }),
      });
    }

    return OK;
  }

  /** Blueprint F3.4 — re-submits a transaction that landed in the failure path. */
  retry(id: string): CommandResult {
    const transaction = this.find(id);
    if (!transaction) return fail('error.transactionMissing');
    if (transaction.status !== 'FAIL') return fail('error.notRetryable');

    this.patch(id, { status: 'PENDING', completedAt: null });
    this.schedule(id, this.toDraft(transaction));
    return OK;
  }

  /** Stops a transaction that has not settled yet. */
  cancel(id: string): CommandResult {
    const transaction = this.find(id);
    if (!transaction) return fail('error.transactionMissing');
    if (transaction.status === 'DONE') return fail('error.alreadyDone');

    this.clearTimer(id);
    this.patch(id, { status: 'FAIL', completedAt: nowIso() });
    this.state.publish({
      eventType: 'TRANSACTION_COMPLETED',
      topic: 'transaction-events',
      severity: 'WARNING',
      title: this.language.instant('event.transactionTitle'),
      message: this.language.instant('event.transactionCancelled', {
        type: this.language.instant(`txType.${transaction.type}`).toLowerCase(),
      }),
    });
    return OK;
  }

  /**
   * Deletes a history row. Settled transactions are reversed first so wallet
   * balances and holdings stay consistent with the remaining history.
   */
  remove(id: string): CommandResult {
    const transaction = this.find(id);
    if (!transaction) return fail('error.transactionMissing');

    this.clearTimer(id);
    if (transaction.status === 'DONE') {
      this.reverse(transaction);
    }

    this.state.setTransactions(this.all().filter((tx) => tx.id !== id));
    return OK;
  }

  private schedule(id: string, draft: TransactionDraft): void {
    this.clearTimer(id);

    const toProcessing = setTimeout(() => {
      this.patch(id, { status: 'PROCESSING' });

      const toDone = setTimeout(() => {
        this.timers.delete(id);
        this.settle(id, draft);
      }, COMPLETION_DELAY_MS);

      this.timers.set(id, toDone);
    }, PROCESSING_DELAY_MS);

    this.timers.set(id, toProcessing);
  }

  /** Applies the portfolio effect, or routes to the failure path if it no longer fits. */
  private settle(id: string, draft: TransactionDraft): void {
    const transaction = this.find(id);
    if (!transaction || transaction.status === 'FAIL') return;

    const validation = this.validate(draft);
    if (!validation.ok) {
      this.patch(id, { status: 'FAIL', completedAt: nowIso() });
      this.state.publish({
        eventType: 'TRANSACTION_COMPLETED',
        topic: 'transaction-events',
        severity: 'CRITICAL',
        title: this.language.instant('event.deadLetterTitle'),
        message: this.language.instant(validation.errorKey ?? 'error.generic'),
      });
      return;
    }

    this.apply(draft);
    this.patch(id, { status: 'DONE', completedAt: nowIso() });

    this.state.publish({
      eventType: 'TRANSACTION_COMPLETED',
      topic: 'transaction-events',
      severity: 'SUCCESS',
      title: this.language.instant('event.transactionTitle'),
      message: this.language.instant('event.transactionDone', {
        type: this.language.instant(`txType.${draft.type}`).toLowerCase(),
        wallet: this.portfolio.walletName(draft.walletId),
      }),
    });
  }

  private apply(draft: TransactionDraft): void {
    const unitPrice =
      draft.unitPrice ?? (draft.quantity ? draft.amount / draft.quantity : draft.amount);
    const symbol = draft.assetSymbol?.toUpperCase() ?? '';

    switch (draft.type) {
      case 'DEPOSIT':
        this.portfolio.adjustBalance(draft.walletId, draft.amount);
        break;
      case 'WITHDRAW':
        this.portfolio.adjustBalance(draft.walletId, -draft.amount);
        break;
      case 'BUY':
        this.portfolio.adjustBalance(draft.walletId, -draft.amount);
        this.portfolio.addHolding(
          draft.walletId,
          symbol,
          draft.assetName ?? symbol,
          draft.quantity ?? 0,
          unitPrice,
        );
        break;
      case 'SELL':
        this.portfolio.adjustBalance(draft.walletId, draft.amount);
        this.portfolio.reduceHolding(draft.walletId, symbol, draft.quantity ?? 0, unitPrice);
        break;
    }
  }

  /** Inverse of {@link apply}, used when deleting a settled transaction. */
  private reverse(transaction: Transaction): void {
    const draft = this.toDraft(transaction);
    const unitPrice =
      draft.unitPrice ?? (draft.quantity ? draft.amount / draft.quantity : draft.amount);
    const symbol = draft.assetSymbol?.toUpperCase() ?? '';

    switch (transaction.type) {
      case 'DEPOSIT':
        this.portfolio.adjustBalance(draft.walletId, -draft.amount);
        break;
      case 'WITHDRAW':
        this.portfolio.adjustBalance(draft.walletId, draft.amount);
        break;
      case 'BUY':
        this.portfolio.adjustBalance(draft.walletId, draft.amount);
        this.portfolio.reduceHolding(draft.walletId, symbol, draft.quantity ?? 0, unitPrice);
        break;
      case 'SELL':
        this.portfolio.adjustBalance(draft.walletId, -draft.amount);
        this.portfolio.addHolding(
          draft.walletId,
          symbol,
          symbol,
          draft.quantity ?? 0,
          unitPrice,
        );
        break;
    }
  }

  private toDraft(transaction: Transaction): TransactionDraft {
    return {
      walletId: transaction.walletId,
      type: transaction.type,
      amount: transaction.amount,
      assetSymbol: transaction.assetSymbol,
      assetName: transaction.assetSymbol,
      quantity: transaction.quantity,
      unitPrice: transaction.quantity ? transaction.amount / transaction.quantity : null,
      description: transaction.description,
    };
  }

  private find(id: string): Transaction | undefined {
    return this.all().find((tx) => tx.id === id);
  }

  private patch(id: string, change: Partial<Transaction> & { status?: TransactionStatus }): void {
    this.state.setTransactions(
      this.all().map((tx) => (tx.id === id ? { ...tx, ...change } : tx)),
    );
  }

  private clearTimer(id: string): void {
    const timer = this.timers.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }
}
