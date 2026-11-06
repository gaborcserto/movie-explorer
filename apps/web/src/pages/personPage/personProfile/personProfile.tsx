import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import type { ReactNode } from 'react';
import type { PersonDetails } from '@movie-explorer/contracts';

import { formatDate } from '../../../i18n/format';
import { i18n } from '../../../i18n';
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
  useTranslation();

  const [expanded, setExpanded] = useState(false);

  const biography = person.biography?.trim() ?? '';
  const isLong = biography.length > 800;
  // Prefer a word boundary, while retaining meaningful line breaks.
  const excerpt = biography.slice(0, 800).replace(/\s+\S*$/, '');

  const age = getPersonAge(person.birthday, person.deathDate);
  const metadata: [string, ReactNode | undefined][] = [
    [i18n.t('ui.known_for'), person.knownForDepartment],
    [
      i18n.t('ui.birthday'),
      person.birthday?.trim() ? (
        <time dateTime={person.birthday}>{formatDate(person.birthday)}</time>
      ) : undefined,
    ],
    [i18n.t('ui.age'), age],
    [
      i18n.t('ui.death_date'),
      person.deathDate?.trim() ? (
        <time dateTime={person.deathDate}>{formatDate(person.deathDate)}</time>
      ) : undefined,
    ],
    [i18n.t('ui.place_of_birth'), person.placeOfBirth],
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
          overlayLabel={i18n.t('messages.viewPhotos')}
          src={person.profileUrl}
          srcSet={person.profileSrcSet}
          fullSrcSet={person.profileSrcSet}
          sizes="(max-width: 767.98px) min(320px, calc(100vw - 52px)), 320px"
          alt={i18n.t('messages.portrait', { name: person.name })}
          title={person.name}
          photos={person.profilePhotos}
          actionLabel={i18n.t('messages.openPortraits', { name: person.name })}
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
          <h2 id="biography-heading">{i18n.t('ui.biography')}</h2>
          <p id="person-biography" className="person-profile__biography">
            {biography && isLong && !expanded
              ? `${excerpt}…`
              : biography || i18n.t('ui.biography_unavailable')}
          </p>
          {isLong && (
            <button
              type="button"
              className="btn btn--outline btn--action btn--mobile-full"
              aria-expanded={expanded}
              aria-controls="person-biography"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded
                ? i18n.t('ui.show_less_label')
                : i18n.t('ui.show_more_label')}
            </button>
          )}
        </section>
      </div>
    </DetailsHeroFrame>
  );
}

export function PersonProfileLoading() {
  useTranslation();

  return (
    <SkeletonRegion label={i18n.t('ui.loading_person_details')}>
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
