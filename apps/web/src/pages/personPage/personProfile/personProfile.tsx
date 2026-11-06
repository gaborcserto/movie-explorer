import { useState } from 'react';
import type { ReactNode } from 'react';
import type { PersonDetails } from '@movie-explorer/contracts';

import HeroImage from '../../../components/heroImage';
import { DetailsMetadata } from '../../../components/details/metadata';
import { DetailsHeroFrame } from '../../../components/details/detailsPageLayout';
import { Skeleton, SkeletonRegion } from '../../../components/skeleton';
import getPersonAge from './personAge';

function isVisibleMetadataValue(value: ReactNode | undefined) {
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  return value !== undefined;
}

export default function PersonProfile({ person }: { person: PersonDetails }) {
  const [expanded, setExpanded] = useState(false);

  const biography = person.biography?.trim() ?? '';
  const isLong = biography.length > 800;
  // Prefer a word boundary, while retaining meaningful line breaks.
  const excerpt = biography.slice(0, 800).replace(/\s+\S*$/, '');

  const age = getPersonAge(person.birthday, person.deathDate);
  const metadata: [string, ReactNode | undefined][] = [
    ['Known for', person.knownForDepartment],
    [
      'Birthday',
      person.birthday?.trim() ? (
        <time dateTime={person.birthday}>{person.birthday}</time>
      ) : undefined,
    ],
    ['Age', age],
    [
      'Death date',
      person.deathDate?.trim() ? (
        <time dateTime={person.deathDate}>{person.deathDate}</time>
      ) : undefined,
    ],
    ['Place of birth', person.placeOfBirth],
  ];
  const visibleMetadata = metadata.filter(([, value]) =>
    isVisibleMetadataValue(value)
  );

  return (
    <DetailsHeroFrame
      className="person-profile"
      title={person.name}
      image={
        <HeroImage
          src={person.profileUrl}
          srcSet={person.profileSrcSet}
          fullSrcSet={person.profileSrcSet}
          sizes="(max-width: 767.98px) min(320px, calc(100vw - 52px)), 320px"
          alt={`Portrait of ${person.name}`}
          title={person.name}
          photos={person.profilePhotos}
          actionLabel={`Open portrait gallery for ${person.name}`}
          className="movie-details__image person-profile__portrait"
        />
      }
    >
      <div className="person-profile__content">
        {visibleMetadata.length > 0 && (
          <DetailsMetadata
            entries={visibleMetadata}
            className="person-profile__metadata"
          />
        )}
        <section aria-labelledby="biography-heading">
          <h2 id="biography-heading">Biography</h2>
          <p id="person-biography" className="person-profile__biography">
            {biography && isLong && !expanded
              ? `${excerpt}…`
              : biography || 'Biography unavailable.'}
          </p>
          {isLong && (
            <button
              type="button"
              className="btn btn--outline btn--action btn--mobile-full"
              aria-expanded={expanded}
              aria-controls="person-biography"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Show Less' : 'Show More'}
            </button>
          )}
        </section>
      </div>
    </DetailsHeroFrame>
  );
}

export function PersonProfileLoading() {
  return (
    <SkeletonRegion label="Loading person details">
      <div className="person-profile person-profile--loading">
        <Skeleton
          className="movie-details__image person-profile__portrait"
          radius={10}
        />
        <div className="person-profile__content">
          <Skeleton height={50} width="75%" />
          <div className="person-profile__metadata">
            {['department', 'birthday', 'age', 'birthplace'].map((field) => (
              <Skeleton key={field} height={39} />
            ))}
          </div>
          <div className="person-profile__biography-placeholder skeleton-copy">
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton
                key={index}
                height={16}
                width={index === 7 ? '65%' : '100%'}
              />
            ))}
          </div>
        </div>
      </div>
    </SkeletonRegion>
  );
}
