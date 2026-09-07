export type TransactionType = 'DEPOSIT' | 'WITHDRAW' | 'BUY' | 'SELL';
export type TransactionStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAIL';

/** What POST /api/transactions accepts today. Backend only reads walletId/type/amount. */
export interface CreateTransactionRequest {
  walletId: string;
  type: TransactionType;
  amount: number;
  // Sent for BUY/SELL — backend must be extended to read these:
  assetSymbol?: string | null;
  assetName?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
  description?: string | null;
}

/** What GET /api/transactions returns today: id, walletId, type, amount, createdAt.
 *  status/isAnomaly/asset* are optional because the backend doesn't send them yet. */
export interface TransactionDto {
  id: string;
  walletId: string;
  type: TransactionType;
  amount: number;
  createdAt: string;
  status?: TransactionStatus;
  isAnomaly?: boolean;
  assetSymbol?: string | null;
  assetName?: string | null;
  quantity?: number | null;
  description?: string | null;
}

export interface TransactionFilters {
  type: TransactionType | 'ALL';
  status: TransactionStatus | 'ALL';
  walletId: string | 'ALL';
  from: string | null;
  to: string | null;
  minAmount: number | null;
  maxAmount: number | null;
  anomaliesOnly: boolean;
}
