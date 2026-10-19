import type { MovieDetails } from '@movie-explorer/contracts';

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

function languageName(code: string | undefined) {
  if (!code?.trim()) {
    return 'Unknown';
  }
  try {
    return (
      new Intl.DisplayNames(['en'], { type: 'language', fallback: 'code' }).of(
        code
      ) ?? code
    );
  } catch {
    return code;
  }
}

function money(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? usd.format(value)
    : 'Unknown';
}

export default function MovieMetadata({ movie }: { movie: MovieDetails }) {
  const entries = [
    [
      'Original title',
      movie.originalTitle?.trim() ? movie.originalTitle : 'Unknown',
    ],
    ['Status', movie.status?.trim() || 'Unknown'],
    ['Original language', languageName(movie.originalLanguage)],
    ['Budget', money(movie.budget)],
    ['Revenue', money(movie.revenue)],
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
        Movie information
      </h2>
      <dl className="movie-details__metadata">
        {entries.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
