import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { CreditPerson } from '@movie-explorer/contracts';

import { i18n } from '../../../i18n';

export default function EpisodeCrew({
  people,
}: {
  people: (CreditPerson & {
    department: string | null;
    jobs: string[];
  })[];
}) {
  useTranslation();

  if (people.length === 0) {
    return null;
  }

  const departments = new Map<string, typeof people>();

  people.forEach((person) => {
    const department = person.department?.trim() || i18n.t('ui.other');
    const departmentPeople = departments.get(department) ?? [];

    departmentPeople.push(person);
    departments.set(department, departmentPeople);
  });

  return (
    <div className="crew-groups episode-crew-groups">
      {[...departments].map(([department, departmentPeople]) => (
        <section className="crew-group" key={department}>
          <h4>{department}</h4>
          <ul className="crew-group__people">
            {departmentPeople.map((person) => (
              <li
                key={`${person.id ?? `${department}:${person.name}`}:${person.jobs.join('|')}`}
              >
                {person.id ? (
                  <Link
                    to={`/person/${person.id}`}
                    className="person-credit-link text-link"
                  >
                    {person.name}
                  </Link>
                ) : (
                  person.name
                )}
                {person.jobs.length > 0 && (
                  <span>{` — ${person.jobs.join(', ')}`}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
