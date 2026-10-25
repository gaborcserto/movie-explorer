import type { ReactNode } from 'react';

export default function DetailsMetadata({
  entries,
}: {
  entries: readonly (readonly [string, ReactNode])[];
}) {
  return (
    <dl className="movie-details__metadata">
      {entries.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
