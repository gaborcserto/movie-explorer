import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import type { PersonDetails } from '@movie-explorer/contracts';

import {
  SectionRecovery,
  DetailError,
} from '../../components/details/recovery';
import PersonProfile, { PersonProfileLoading } from './personProfile';
import DetailsPageLayout from '../../components/details/detailsPageLayout';
import { ResultsSkeleton } from '../../components/skeleton';
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
import Filmography, { replaceFilmographyGroup } from './filmography';
import parseDetailId from '../../util/detailId';
import { EntityMetadata } from '../../components/routeMetadata';

type PersonState =
  | { status: 'loading' | 'not-found' | 'error' }
  | { status: 'success'; person: PersonDetails };

function PersonDetailsPage({ id }: { id: string }) {
  const personId = parseDetailId(id);
  const validId = Number.isSafeInteger(personId) && personId > 0;

  const [state, setState] = useState<PersonState>({ status: 'loading' });
  const [requestError, setRequestError] = useState<unknown>(null);
  const [pending, setPending] = useState(validId);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!validId) {
      return undefined;
    }

    const controller = new AbortController();
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
        {state.status === 'success' && (
          <EntityMetadata kind="person" data={state.person} />
        )}
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
