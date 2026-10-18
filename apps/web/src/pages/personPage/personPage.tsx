import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { PersonDetails } from '@movie-explorer/contracts';
import SectionRecovery from '../../components/details/sectionRecovery';
import HeroImage from '../../components/details/heroImage';
import Footer from '../../layouts/footer';
import Loading from '../../layouts/loading';
import DetailError from '../../components/details/detailError';
import presentApiError, {
  isCancelledError,
} from '../../util/errorPresentation';
import {
  getPerson,
  getFilmography,
  isNotFoundError,
} from '../../util/apiUtils';
import './personPage.scss';
import Filmography from './filmography';
import HeaderSearch from '../../components/search/headerSearch';
import getPersonAge from './personAge';
import useDetailPage from '../../components/details/useDetailPage';
import parseDetailId from '../../util/detailId';

type PersonState =
  | { status: 'loading' | 'not-found' | 'error' }
  | { status: 'success'; person: PersonDetails };

function getPosterUrls(person: PersonDetails) {
  return [
    ...new Set(
      person.filmography
        .map((entry) => entry.posterUrl?.trim())
        .filter((url): url is string => Boolean(url))
    ),
  ].slice(0, 12);
}

function PersonProfile({ person }: { person: PersonDetails }) {
  const [expanded, setExpanded] = useState(false);
  const biography = person.biography?.trim() ?? '';
  const isLong = biography.length > 800;
  // Prefer a word boundary, while retaining meaningful line breaks.
  const excerpt = biography.slice(0, 800).replace(/\s+\S*$/, '');
  const age = getPersonAge(person.birthday, person.deathDate);
  const metadata: [string, string | number | undefined][] = [
    ['Known for', person.knownForDepartment],
    ['Birthday', person.birthday],
    ['Age', age],
    ['Death date', person.deathDate],
    ['Place of birth', person.placeOfBirth],
  ];
  const visibleMetadata = metadata.filter(([, value]) =>
    typeof value === 'number' ? Number.isFinite(value) : value?.trim()
  );
  return (
    <div className="person-profile">
      <HeroImage
        src={person.profileUrl}
        srcSet={person.profileSrcSet}
        fullSrcSet={person.profileSrcSet}
        sizes="(max-width: 767.98px) min(320px, calc(100vw - 52px)), 320px"
        alt={`Portrait of ${person.name}`}
        title={person.name}
        className="person-profile__portrait"
      />
      <div className="person-profile__content">
        <h1>{person.name}</h1>
        {visibleMetadata.length > 0 && (
          <dl className="person-profile__metadata">
            {visibleMetadata.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>
                  {typeof value === 'string' &&
                  (label === 'Birthday' || label === 'Death date') ? (
                    <time dateTime={value}>{value}</time>
                  ) : (
                    value
                  )}
                </dd>
              </div>
            ))}
          </dl>
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
    </div>
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
    if (!validId) return undefined;
    const controller = new AbortController();
    setPending(true);
    let current = true;
    getPerson(personId, controller.signal)
      .then((person) => {
        if (current && !controller.signal.aborted)
          setState({ status: 'success', person });
      })
      .catch((error: unknown) => {
        if (current && !controller.signal.aborted) {
          if (isCancelledError(error)) return;
          setRequestError(error);
          setState({ status: isNotFoundError(error) ? 'not-found' : 'error' });
        }
      })
      .finally(() => {
        if (current) setPending(false);
      });
    return () => {
      current = false;
      controller.abort();
    };
  }, [personId, validId, attempt]);

  const title = validId ? 'Person not found' : 'Invalid person ID';
  const posterUrls =
    state.status === 'success' ? getPosterUrls(state.person) : [];

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
  const mainRef = useDetailPage(pageTitle);

  return (
    <div className="detail-page">
      <header className="detail-page__navigation movie-details container">
        <div className="movie-details__top person-header detail-header">
          <Link to="/search" className="movie-details__brand brand">
            <strong>Movie</strong> Explorer
          </Link>
          <HeaderSearch />
        </div>
      </header>
      <main ref={mainRef} tabIndex={-1} aria-label={pageTitle}>
        <div className="person-hero detail-page__hero">
          {posterUrls.length > 0 && (
            <div className="person-hero__posters" aria-hidden="true">
              {posterUrls.map((url) => (
                <img key={url} src={url} alt="" loading="lazy" />
              ))}
            </div>
          )}
          <div className="movie-details container person-hero__container">
            {state.status === 'success' && (
              <PersonProfile person={state.person} />
            )}
          </div>
        </div>
        <div className="main person-page container">
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
              {state.status === 'loading' && <h1>Person details</h1>}
              {state.status === 'loading' && (
                <Loading className="person-page__state" />
              )}
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
              {state.status === 'success' && (
                <Filmography
                  entries={state.person.filmography}
                  unavailable={
                    state.person.filmographyAvailability?.status ===
                    'unavailable'
                  }
                  recovery={
                    <SectionRecovery
                      label="Filmography"
                      availability={state.person.filmographyAvailability}
                      recover={async (signal) => {
                        const result = await getFilmography(personId, signal);
                        if (signal.aborted) return;
                        setState((previous) =>
                          previous.status === 'success'
                            ? {
                                status: 'success',
                                person: {
                                  ...previous.person,
                                  ...result,
                                  filmographyAvailability: {
                                    status: 'available',
                                  },
                                },
                              }
                            : previous
                        );
                      }}
                    />
                  }
                />
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function PersonPage() {
  const { id = '' } = useParams();
  // Each route owns its request, biography state, and initial focus.
  return <PersonDetailsPage key={id} id={id} />;
}
