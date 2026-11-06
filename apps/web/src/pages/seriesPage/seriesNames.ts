import { i18n } from '../../i18n';

export default function seasonName(number: number, title?: string) {
  const label =
    number === 0
      ? i18n.t('ui.specials')
      : i18n.t('messages.seasonNumber', { number });

  return title && title.toLowerCase() !== label.toLowerCase()
    ? `${label}: ${title}`
    : label;
}
