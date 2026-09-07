import { HttpClient } from '@angular/common/http';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateTransactionRequest, TransactionDto } from '../models/transaction.model';

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly baseUrl = `${environment.apiUrl}/transactions`;

  private readonly state = signal<TransactionDto[]>([]);
  readonly all = this.state.asReadonly();

  /** Load history from the backend. Call on page init and after each create. */
  refresh(): void {
    this.http.get<TransactionDto[]>(this.baseUrl)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (list) => this.state.set(list) });
  }

  create(body: CreateTransactionRequest): Observable<TransactionDto> {
    return this.http.post<TransactionDto>(this.baseUrl, body);
  }

  // ---- Not yet supported by the backend. Kept so the UI compiles. ----
  // TODO(backend): POST /api/transactions/{id}/retry
  retry(_id: string): void {
    console.warn('retry() not implemented on the backend yet');
  }
  // TODO(backend): POST /api/transactions/{id}/cancel
  cancel(_id: string): void {
    console.warn('cancel() not implemented on the backend yet');
  }
  // TODO(backend): DELETE /api/transactions/{id}
  remove(_id: string): void {
    console.warn('remove() not implemented on the backend yet');
  }

  /** Used by the trade form's "available quantity" hint. No backend source yet → 0. */
  availableQuantity(_walletId: string, _assetSymbol: string): number {
    return 0; // TODO: derive from portfolio holdings once backend supports SELL
  }
}
