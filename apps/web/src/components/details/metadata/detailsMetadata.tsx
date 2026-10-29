import type { ReactNode } from 'react';

export default function DetailsMetadata({
  entries,
  className = 'movie-details__metadata',
}: {
  entries: readonly (readonly [string, ReactNode])[];
  className?: string;
}) {
  return (
    <dl className={className}>
      {entries.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
