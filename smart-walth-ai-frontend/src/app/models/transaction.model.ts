export type TransactionType = 'DEPOSIT' | 'WITHDRAW' | 'BUY' | 'SELL';
export type TransactionStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAIL';

/** Shape of `assets/data/transactions.json` — mirrors the Transaction Service table. */
export interface Transaction {
  id: string;
  userId: string;
  walletId: string;
  type: TransactionType;
  amount: number;
  assetSymbol: string | null;
  quantity: number | null;
  status: TransactionStatus;
  isAnomaly: boolean;
  description: string | null;
  createdAt: string;
  completedAt: string | null;
}

/** Filter state for the transaction history (blueprint F3.3). */
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
