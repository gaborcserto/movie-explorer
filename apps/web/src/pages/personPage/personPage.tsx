import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import type { PersonDetails } from '@movie-explorer/contracts';

import {
  SectionRecovery,
  DetailError,
} from '../../components/details/recovery';
import HeroImage from '../../components/heroImage';
import DetailsMetadata from '../../components/details/metadata/detailsMetadata';
import DetailsPageLayout, {
  DetailsHeroFrame,
} from '../../components/details/detailsPageLayout';
import PhotoPreview from '../../components/details/media';
import Skeleton, { SkeletonRegion } from '../../components/skeleton/skeleton';
import { ResultsSkeleton } from '../../components/skeleton/contentSkeletons';
import presentApiError, {
  isCancelledError,
} from '../../util/errorPresentation';
import {
  getPerson,
  getCombinedFilmography,
  getFilmography,
  isNotFoundError,
} from '../../util/apiUtils';
import './personPage.scss';
import Filmography from './filmography';
import getPersonAge from './personAge';
import parseDetailId from '../../util/detailId';
import { replaceFilmographyGroup } from './filmographyRules';

type PersonState =
  | { status: 'loading' | 'not-found' | 'error' }
  | { status: 'success'; person: PersonDetails };

function isVisibleMetadataValue(value: ReactNode | undefined) {
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  return value !== undefined;
}

function PersonProfile({ person }: { person: PersonDetails }) {
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
              className="btn btn--outline btn--action"
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

function PersonProfileLoading() {
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

function PersonDetailsPage({ id }: { id: string }) {
  const personId = parseDetailId(id);
  const validId = Number.isSafeInteger(personId) && personId > 0;

  const [state, setState] = useState<PersonState>({ status: 'loading' });
  const [requestError, setRequestError] = useState<unknown>(null);
  const [pending, setPending] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!validId) {
      return undefined;
    }

    const controller = new AbortController();
    setPending(true);
    let current = true;

    getPerson(personId, controller.signal, true)
      .then((person) => {
        if (current && !controller.signal.aborted) {
          setState({ status: 'success', person });
        }
      })
      .catch((error: unknown) => {
        if (current && !controller.signal.aborted) {
          if (isCancelledError(error)) {
            return;
          }

          setRequestError(error);
          setState({ status: isNotFoundError(error) ? 'not-found' : 'error' });
        }
      })
      .finally(() => {
        if (current) {
          setPending(false);
        }
      });

    return () => {
      current = false;
      controller.abort();
    };
  }, [personId, validId, attempt]);

  const title = validId ? 'Person not found' : 'Invalid person ID';

  let pageTitle = title;

  if (validId && state.status !== 'not-found') {
    pageTitle =
      state.status === 'success'
        ? state.person.name
        : {
            loading: 'Loading person',
            error: pending
              ? 'Loading person'
              : (presentApiError(requestError)?.heading ?? 'Person details'),
          }[state.status];
  }

  const recoverFilmographyGroup = async (
    type: 'movie' | 'tv',
    signal: AbortSignal
  ) => {
    const result = await getCombinedFilmography(personId, type, signal);

    if (signal.aborted) {
      return;
    }

    setState((previous) => {
      if (
        previous.status !== 'success' ||
        !previous.person.combinedFilmography
      ) {
        return previous;
      }

      return {
        status: 'success',
        person: {
          ...previous.person,
          combinedFilmography: replaceFilmographyGroup(
            previous.person.combinedFilmography,
            result,
            type
          ),
        },
      };
    });
  };

  const recoverFilmography = async (signal: AbortSignal) => {
    const result = await getFilmography(personId, signal);

    if (signal.aborted) {
      return;
    }

    setState((previous) =>
      previous.status === 'success'
        ? {
            status: 'success',
            person: {
              ...previous.person,
              ...result,
              filmographyAvailability: { status: 'available' },
            },
          }
        : previous
    );
  };

  return (
    <DetailsPageLayout
      title={pageTitle}
      className="detail-page main"
      heroClassName="person-hero"
      heroContainerClassName="person-hero__container"
      hero={
        <>
          {validId && state.status === 'loading' && <PersonProfileLoading />}
          {state.status === 'success' && (
            <PersonProfile person={state.person} />
          )}
        </>
      }
    >
      <div className="main person-page container">
        {validId && state.status === 'loading' && (
          <ResultsSkeleton
            className="person-filmography-skeleton"
            label="Loading filmography"
          />
        )}
        {!validId || state.status === 'not-found' ? (
          <DetailError
            heading={title}
            description={
              validId
                ? 'We could not find that person.'
                : 'Please use a valid positive whole-number person ID.'
            }
          />
        ) : (
          <>
            {state.status === 'error' && (
              <DetailError
                {...(presentApiError(requestError) ?? {
                  heading: 'Something went wrong',
                  description: 'Please try again.',
                })}
                pending={pending}
                retry={() => {
                  setPending(true);
                  setAttempt((value) => value + 1);
                }}
              />
            )}
            {state.status === 'success' &&
              Boolean(state.person.profilePhotos?.length) && (
                <section
                  className="details-section media-section"
                  aria-labelledby="person-photos-heading"
                >
                  <div className="media-block">
                    <h3 id="person-photos-heading">Photos</h3>
                    <PhotoPreview
                      photos={state.person.profilePhotos ?? []}
                      title={state.person.name}
                      portrait
                      resetKey={state.person.id}
                    />
                  </div>
                </section>
              )}
            {state.status === 'success' && (
              <Filmography
                entries={
                  state.person.combinedFilmography?.entries ??
                  state.person.filmography
                }
                groups={state.person.combinedFilmography?.groups}
                unavailable={
                  !state.person.combinedFilmography &&
                  state.person.filmographyAvailability?.status === 'unavailable'
                }
                recovery={
                  state.person.combinedFilmography ? (
                    <>
                      {(['movie', 'tv'] as const).map((type) => (
                        <SectionRecovery
                          key={type}
                          label={
                            type === 'movie'
                              ? 'Movie credits'
                              : 'Series credits'
                          }
                          availability={
                            state.person.combinedFilmography?.groups[type]
                          }
                          recover={(signal) =>
                            recoverFilmographyGroup(type, signal)
                          }
                        />
                      ))}
                    </>
                  ) : (
                    <SectionRecovery
                      label="Filmography"
                      availability={state.person.filmographyAvailability}
                      recover={recoverFilmography}
                    />
                  )
                }
              />
            )}
          </>
        )}
      </div>
    </DetailsPageLayout>
  );
}

export default function PersonPage() {
  const { id = '' } = useParams();

  // Each route owns its request, biography state, and initial focus.
  return <PersonDetailsPage key={id} id={id} />;
}
