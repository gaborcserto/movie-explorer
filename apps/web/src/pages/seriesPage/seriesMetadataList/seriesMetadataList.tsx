import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { i18n } from '../../../i18n';

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
  useTranslation();

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
      <summary
        aria-label={i18n.t('messages.expandPeople', {
          label,
          count: people.length,
        })}
      >
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
