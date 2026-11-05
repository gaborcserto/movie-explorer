import { Link } from 'react-router';

// Native disclosures keep long organization/person lists out of the hero flow.
export default function SeriesMetadataList({
  label,
  people,
  linked = false,
}: {
  label: string;
  people: { id?: number | null; name: string }[];
  linked?: boolean;
}) {
  const content = (
    <ul className="series-people">
      {people.map((person) => (
        <li key={`${person.id ?? 'unknown'}-${person.name}`}>
          {linked && person.id ? (
            <Link className="text-link" to={`/person/${person.id}`}>
              {person.name}
            </Link>
          ) : (
            person.name
          )}
        </li>
      ))}
    </ul>
  );

  if (people.length <= 2) {
    return content;
  }

  return (
    <details className="series-metadata-disclosure">
      <summary aria-label={`${label}: ${people.length}, expand or collapse`}>
        {people
          .slice(0, 2)
          .map((person) => person.name)
          .join(', ')}{' '}
        (+{people.length - 2})
      </summary>
      <div className="series-metadata-disclosure__content">{content}</div>
    </details>
  );
}
