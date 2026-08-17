import { TransactionType } from './transaction.model';
import { WalletType } from './wallet.model';

/** Payload of POST /api/wallets — the persisted fields the user actually supplies. */
export interface WalletDraft {
  name: string;
  type: WalletType;
  balance: number;
  currency: string;
}

/** Payload for creating or editing a holding inside a wallet (blueprint F2.2). */
export interface AssetDraft {
  walletId: string;
  symbol: string;
  name: string;
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number | null;
}

/**
 * Payload for the transaction composer (blueprint F3.1 / F3.2). `assetSymbol`,
 * `assetName` and `quantity` only apply to BUY / SELL.
 */
export interface TransactionDraft {
  walletId: string;
  type: TransactionType;
  amount: number;
  assetSymbol: string | null;
  assetName: string | null;
  quantity: number | null;
  unitPrice: number | null;
  description: string | null;
}

/** Payload of PUT /api/users/me. */
export interface ProfileDraft {
  firstName: string;
  lastName: string;
  email: string;
}

/** Outcome of a state mutation, so the UI can surface why a command was refused. */
export interface CommandResult {
  ok: boolean;
  /** Translation key describing the failure, when `ok` is false. */
  errorKey?: string;
  /** Id of the entity a create command produced. */
  id?: string;
}

export const OK: CommandResult = { ok: true };

export function created(id: string): CommandResult {
  return { ok: true, id };
}

export function fail(errorKey: string): CommandResult {
  return { ok: false, errorKey };
}
