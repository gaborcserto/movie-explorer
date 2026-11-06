import { useTranslation } from 'react-i18next';
import type { MovieDetails } from '@movie-explorer/contracts';

import { statusLabel } from '../../../i18n/labels';
import { i18n } from '../../../i18n';
import DetailsMetadata from './detailsMetadata';

const usd = () =>
  new Intl.NumberFormat(i18n.language, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

function languageName(code: string | undefined) {
  if (!code?.trim()) {
    return i18n.t('ui.unknown');
  }

  try {
    return (
      new Intl.DisplayNames([i18n.language], {
        type: 'language',
        fallback: 'code',
      }).of(code) ?? code
    );
  } catch {
    return code;
  }
}

function money(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? usd().format(value)
    : i18n.t('ui.unknown');
}

export default function MovieMetadata({ movie }: { movie: MovieDetails }) {
  useTranslation();

  const entries: [string, string][] = [
    [
      i18n.t('ui.original_title'),
      movie.originalTitle?.trim() ? movie.originalTitle : i18n.t('ui.unknown'),
    ],
    [
      i18n.t('ui.status'),
      statusLabel(movie.status?.trim()) || i18n.t('ui.unknown'),
    ],
    [i18n.t('ui.original_language'), languageName(movie.originalLanguage)],
    [i18n.t('ui.budget'), money(movie.budget)],
    [i18n.t('ui.revenue'), money(movie.revenue)],
  ];

  return (
    <section
      className="movie-details__section movie-details__information"
      aria-labelledby="movie-information-heading"
    >
      <h2
        className="movie-details__section-title"
        id="movie-information-heading"
      >
        {i18n.t('ui.movie_information')}
      </h2>
      <DetailsMetadata entries={entries} />
    </section>
  );
}
