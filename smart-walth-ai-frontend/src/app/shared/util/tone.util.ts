import {
  NotificationSeverity,
  Priority,
  RiskLevel,
  ServiceStatus,
  TransactionStatus,
  TransactionType,
  WalletType,
} from '../../models';
import { ChartTone } from '../components/chart/chart.component';
import { ChipTone } from '../components/status-chip/status-chip.component';

export function transactionStatusTone(status: TransactionStatus): ChipTone {
  switch (status) {
    case 'DONE':
      return 'positive';
    case 'FAIL':
      return 'negative';
    case 'PENDING':
    case 'PROCESSING':
      return 'warning';
  }
}

/** BUY/SELL and DEPOSIT/WITHDRAW are directional, so they earn the semantic colours. */
export function transactionTypeTone(type: TransactionType): ChipTone {
  switch (type) {
    case 'BUY':
    case 'DEPOSIT':
      return 'positive';
    case 'SELL':
    case 'WITHDRAW':
      return 'negative';
  }
}

export function riskLevelTone(level: RiskLevel): ChipTone {
  switch (level) {
    case 'LOW':
      return 'positive';
    case 'MODERATE':
      return 'warning';
    case 'HIGH':
      return 'negative';
  }
}

export function priorityTone(priority: Priority): ChipTone {
  switch (priority) {
    case 'LOW':
      return 'info';
    case 'MEDIUM':
      return 'warning';
    case 'HIGH':
      return 'negative';
  }
}

export function serviceStatusTone(status: ServiceStatus): ChipTone {
  switch (status) {
    case 'UP':
      return 'positive';
    case 'DEGRADED':
      return 'warning';
    case 'DOWN':
      return 'negative';
  }
}

export function notificationSeverityTone(severity: NotificationSeverity): ChipTone {
  switch (severity) {
    case 'SUCCESS':
      return 'positive';
    case 'WARNING':
      return 'warning';
    case 'CRITICAL':
      return 'negative';
    case 'INFO':
      return 'info';
  }
}

/**
 * Wallet types are categorical, so they avoid the gain/loss pair. Crypto maps to
 * `warning` because it is the at-risk bucket the RAG rules cap at 20 %.
 */
export function walletTypeChartTone(type: WalletType): ChartTone {
  switch (type) {
    case 'STOCKS':
      return 'info';
    case 'SAVINGS':
      return 'neutral';
    case 'CRYPTO':
      return 'warning';
  }
}
