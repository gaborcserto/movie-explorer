import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { PersonDetails } from '@movie-explorer/contracts';
import CustomImage from '../../components/utility/customImage';
import Footer from '../../layouts/footer';
import Loading from '../../layouts/loading';
import Error from '../../layouts/error';
import { getPerson, isNotFoundError } from '../../util/apiUtils';
import './personPage.scss';

type PersonState =
  | { status: 'loading' | 'not-found' | 'error' }
  | { status: 'success'; person: PersonDetails };

function PersonProfile({ person }: { person: PersonDetails }) {
  const [expanded, setExpanded] = useState(false);
  const biography = person.biography?.trim() ?? '';
  const isLong = biography.length > 800;
  // Prefer a word boundary, while retaining meaningful line breaks.
  const excerpt = biography.slice(0, 800).replace(/\s+\S*$/, '');
  // Higher density candidates can point at the full-resolution original.
  const portraitSrcSet = person.profileSrcSet
    ?.split(',')
    .filter((candidate) => {
      const density = candidate.match(/\s(\d+(?:\.\d+)?)x\s*$/)?.[1];
      return !density || Number(density) <= 2;
    })
    .join(',');
  const metadata = [
    ['Known for', person.knownForDepartment],
    ['Birthday', person.birthday],
    ['Death date', person.deathDate],
    ['Place of birth', person.placeOfBirth],
  ].filter(([, value]) => value?.trim());

  return (
    <div className="person-profile">
      <CustomImage
        src={person.profileUrl}
        srcSet={portraitSrcSet}
        sizes="(max-width: 767.98px) min(260px, calc(100vw - 32px)), 320px"
        loading="eager"
        alt={`Portrait of ${person.name}`}
        className="person-profile__portrait"
      />
      <div className="person-profile__content">
        <h1>{person.name}</h1>
        {metadata.length > 0 && (
          <dl className="person-profile__metadata">
            {metadata.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>
                  {label === 'Birthday' || label === 'Death date' ? (
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
              className="btn btn--outline"
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
  const personId = /^\d+$/.test(id) ? Number(id) : NaN;
  const validId = Number.isSafeInteger(personId) && personId > 0;
  const [state, setState] = useState<PersonState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (!validId) return undefined;
    const controller = new AbortController();
    let current = true;
    getPerson(personId, controller.signal)
      .then((person) => {
        if (current) setState({ status: 'success', person });
      })
      .catch((error: unknown) => {
        if (current) {
          setState({ status: isNotFoundError(error) ? 'not-found' : 'error' });
        }
      });
    return () => {
      current = false;
      controller.abort();
    };
  }, [personId, validId, attempt]);

  const title = validId ? 'Person not found' : 'Invalid person ID';

  return (
    <>
      <header className="person-header container">
        <Link to="/search" className="brand">
          <strong>Movie</strong> Explorer
        </Link>
        <Link to="/search" className="person-header__search">
          Search movies
        </Link>
      </header>
      <main ref={mainRef} tabIndex={-1} className="main person-page container">
        {!validId || state.status === 'not-found' ? (
          <>
            <h1>{title}</h1>
            <Error
              className="person-page__state"
              message={
                validId
                  ? 'We could not find that person.'
                  : 'Please use a valid positive whole-number person ID.'
              }
            />
            <Link to="/search" className="btn btn--outline">
              Browse movies
            </Link>
          </>
        ) : (
          <>
            {state.status !== 'success' && <h1>Person details</h1>}
            {state.status === 'loading' && (
              <Loading className="person-page__state" />
            )}
            {state.status === 'error' && (
              <Error
                className="person-page__state"
                title="Unable to load person"
                message="Something went wrong while loading this person."
                actionLabel="Try again"
                onAction={() => {
                  setState({ status: 'loading' });
                  setAttempt((value) => value + 1);
                }}
              />
            )}
            {state.status === 'success' && (
              <PersonProfile person={state.person} />
            )}
          </>
        )}
      </main>
      <Footer />
    </>
  );
}

export default function PersonPage() {
  const { id = '' } = useParams();
  // Each route owns its request, biography state, and initial focus.
  return <PersonDetailsPage key={id} id={id} />;
}
