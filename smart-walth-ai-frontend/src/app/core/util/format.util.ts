import { formatCurrency, formatDate, formatNumber, getCurrencySymbol } from '@angular/common';

/**
 * Shared formatting helpers. Everything numeric in the app funnels through here
 * (or through Angular's pipes) so digit grouping stays consistent per locale.
 */

export function formatMoney(
  value: number,
  locale: string,
  currencyCode = 'USD',
  digitsInfo = '1.2-2',
): string {
  return formatCurrency(
    value,
    locale,
    getCurrencySymbol(currencyCode, 'narrow', locale),
    currencyCode,
    digitsInfo,
  );
}

export function formatSignedMoney(
  value: number,
  locale: string,
  currencyCode = 'USD',
  digitsInfo = '1.2-2',
): string {
  const formatted = formatMoney(Math.abs(value), locale, currencyCode, digitsInfo);
  return `${signPrefix(value)}${formatted}`;
}

export function formatPercent(value: number, locale: string, digitsInfo = '1.0-2'): string {
  return `${formatNumber(value, locale, digitsInfo)} %`;
}

export function formatSignedPercent(value: number, locale: string, digitsInfo = '1.2-2'): string {
  return `${signPrefix(value)}${formatNumber(Math.abs(value), locale, digitsInfo)} %`;
}

export function formatQuantity(value: number, locale: string): string {
  return formatNumber(value, locale, '1.0-6');
}

export function formatNumberValue(value: number, locale: string, digitsInfo = '1.0-2'): string {
  return formatNumber(value, locale, digitsInfo);
}

export function formatDateTime(value: string, locale: string): string {
  return formatDate(value, 'dd MMM yyyy, HH:mm', locale) ?? value;
}

export function formatDay(value: string, locale: string): string {
  return formatDate(value, 'dd MMM yyyy', locale) ?? value;
}

export function formatMonth(value: string, locale: string): string {
  return formatDate(value, 'MMM yy', locale) ?? value;
}

/** `+` for gains, `-` for losses, nothing for exactly zero. */
export function signPrefix(value: number): string {
  if (value > 0) return '+';
  if (value < 0) return '-';
  return '';
}

export type Direction = 'up' | 'down' | 'flat';

export function direction(value: number): Direction {
  if (value > 0) return 'up';
  if (value < 0) return 'down';
  return 'flat';
}
