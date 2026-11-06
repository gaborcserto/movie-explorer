import { i18n } from './index';

export function formatNumber(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat(i18n.language, { maximumFractionDigits }).format(
    value
  );
}

export function formatDate(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(i18n.language, { timeZone: 'UTC' }).format(date);
}
