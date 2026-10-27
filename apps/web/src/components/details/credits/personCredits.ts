import type {
  MovieCastMember,
  MovieDetails,
  MovieDirector,
} from '@movie-explorer/contracts';

export interface MoviePersonCredit extends MovieDirector {
  key: string;
  roles: string[];
}

interface MoviePersonCredits {
  directors: MoviePersonCredit[];
  writers: MoviePersonCredit[];
  producers: MoviePersonCredit[];
  cast: MoviePersonCredit[];
}

export function hasPersonId(id: number | undefined): id is number {
  return id !== undefined && Number.isSafeInteger(id) && id > 0;
}

function groupPeople(
  members: (MovieDirector & { roles?: string[] })[],
  category: 'director' | 'writer' | 'producer' | 'cast'
): MoviePersonCredit[] {
  const byId = new Map<number, MoviePersonCredit>();
  const unlinkedByName = new Map<string, MoviePersonCredit>();
  const people: MoviePersonCredit[] = [];

  members.forEach((person, index) => {
    if (!person.name.trim()) {
      return;
    }

    const { id } = person;
    const hasId = hasPersonId(id);
    let credit = hasId ? byId.get(id) : undefined;

    if (!hasId && category !== 'cast') {
      credit = unlinkedByName.get(person.name.trim());
    }

    if (!credit) {
      credit = {
        ...person,
        name: person.name.trim(),
        key: hasId ? `person-${id}` : `${category}-${index}`,
        roles: [],
      };
      people.push(credit);

      if (hasId) {
        byId.set(id, credit);
      } else if (category !== 'cast') {
        unlinkedByName.set(credit.name, credit);
      }
    }

    credit.profileUrl ||= person.profileUrl;
    credit.profileSrcSet ||= person.profileSrcSet;

    (person.roles ?? []).forEach((role) => {
      const label = role.trim();

      if (label && !credit.roles.includes(label)) {
        credit.roles.push(label);
      }
    });
  });

  return people;
}

export function getMoviePersonCredits(movie: MovieDetails): MoviePersonCredits {
  const directors = groupPeople(movie.directors ?? [], 'director');
  const writers = groupPeople(movie.writers ?? [], 'writer');
  const producers = groupPeople(movie.producers ?? [], 'producer');
  const structuredCast = (movie.castMembers ?? []).filter((person) =>
    person.name.trim()
  );

  // Consume legacy occurrences only for display; names never merge identities.
  const legacyNames = movie.cast.map((name) => name.trim()).filter(Boolean);

  structuredCast.forEach((person) => {
    const index = legacyNames.indexOf(person.name.trim());

    if (index >= 0) {
      legacyNames.splice(index, 1);
    }
  });

  const castMembers: MovieCastMember[] = [
    ...structuredCast,
    ...legacyNames.map((name) => ({ name })),
  ];
  const cast = groupPeople(
    castMembers.map((person) => ({
      ...person,
      roles: person.character ? [person.character] : [],
    })),
    'cast'
  );

  return { directors, writers, producers, cast };
}
