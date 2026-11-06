import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { CombinedFilmography } from '@movie-explorer/contracts';

import { i18n } from '../../../i18n';
import { CardRating } from '../../../components/card';
import AnimatedSelect from '../../../components/animatedSelect';
import MovieImage from '../../../components/utility/customImage';
import useStablePanelHeight from '../../../hooks/useStablePanelHeight';
import { getPosterDisplaySrcSet } from '../../../util/imageSizing';
import { mediaPath } from '../../../util/seriesRoutes';
import './filmography.scss';
import {
  filmographyIdentity,
  filmographyDate,
  getFilmographySelection,
  getFilmographyRoles,
} from './filmographyRules';
import type { FilmographyView, FilmographyEntry } from './filmographyRules';

const FILMOGRAPHY_BATCH_SIZE = 10;
const filmographySortOptions = [
  {
    value: 'newest',
    get label() {
      return i18n.t('ui.newest_first');
    },
  },
  {
    value: 'oldest',
    get label() {
      return i18n.t('ui.oldest_first');
    },
  },
  {
    value: 'title',
    get label() {
      return i18n.t('ui.title_a_z');
    },
  },
];

function FilmographyResults({
  movies,
  view,
  role,
  combined,
}: {
  movies: FilmographyEntry[];
  view: FilmographyView;
  role: string;
  combined: boolean;
}) {
  useTranslation();

  const [visibleCount, setVisibleCount] = useState(FILMOGRAPHY_BATCH_SIZE);
  const countRef = useRef<HTMLParagraphElement>(null);

  const visibleMovies = movies.slice(0, visibleCount);

  return (
    <>
      <p
        ref={countRef}
        tabIndex={-1}
        className="filmography__count"
        role="status"
      >
        {i18n.t('messages.shownCount', {
          shown: visibleMovies.length,
          count: movies.length,
          kind: i18n.t(combined ? 'nouns.titles' : 'nouns.movies', {
            count: movies.length,
          }),
        })}
      </p>
      {movies.length === 0 && (
        <p>
          {combined
            ? i18n.t('ui.no_credits_available_for_this_selection')
            : i18n.t('ui.no_movie_credits_available')}
        </p>
      )}
      <ul className="filmography__list">
        {visibleMovies.map((movie) => {
          const roles = getFilmographyRoles(movie, view, role);
          const metadataId = `filmography-metadata-${filmographyIdentity(movie)}`;
          const date = filmographyDate(movie);
          const isSeries = 'mediaType' in movie && movie.mediaType === 'tv';
          const content = (
            <>
              <div className="filmography__poster">
                <MovieImage
                  src={movie.posterUrl ?? undefined}
                  srcSet={getPosterDisplaySrcSet(
                    movie.posterUrl ?? undefined,
                    movie.posterSrcSet
                  )}
                  sizes="48px"
                  loading="lazy"
                  alt=""
                  className="filmography__image"
                />
              </div>
              <div className="filmography__heading">
                <span className="filmography__title">{movie.title}</span>
                {combined && (
                  <span className="filmography__media-type">
                    {i18n.t(isSeries ? 'mediaTypes.tv' : 'mediaTypes.movie')}
                  </span>
                )}
              </div>
              <div id={metadataId} className="filmography__metadata">
                {date && (
                  <time className="filmography__year" dateTime={date}>
                    {date.substring(0, 4)}
                  </time>
                )}
                <CardRating
                  rating={movie.rating}
                  className="filmography__rating"
                />
                {roles.length > 0 && (
                  <p className="filmography__role">{roles.join(' · ')}</p>
                )}
              </div>
            </>
          );

          return (
            <li key={filmographyIdentity(movie)}>
              {Number.isSafeInteger(movie.id) && movie.id > 0 ? (
                <Link
                  to={mediaPath(isSeries ? 'tv' : 'movie', movie.id)}
                  className="filmography__row"
                  aria-label={movie.title}
                  aria-describedby={metadataId}
                >
                  {content}
                </Link>
              ) : (
                <div className="filmography__row">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
      {visibleCount < movies.length && (
        <div className="filmography__more">
          <button
            type="button"
            className="btn btn--outline btn--action btn--mobile-full"
            onClick={() => {
              const nextCount = visibleCount + FILMOGRAPHY_BATCH_SIZE;
              setVisibleCount(nextCount);
              // Keep focus on a useful, surviving element after the final batch.
              if (nextCount >= movies.length) {
                countRef.current?.focus({ preventScroll: true });
              }
            }}
          >
            {i18n.t('ui.load_more')}
          </button>
        </div>
      )}
    </>
  );
}

export default function Filmography({
  entries,
  unavailable = false,
  recovery,
  groups,
}: {
  entries: FilmographyEntry[];
  unavailable?: boolean;
  recovery?: ReactNode;
  groups?: CombinedFilmography['groups'];
}) {
  useTranslation();

  const [searchParams, setSearchParams] = useSearchParams();
  const requestedType = searchParams.get('personType');
  const partial =
    groups &&
    (requestedType === 'movie' || requestedType === 'tv'
      ? groups[requestedType]?.status === 'unavailable'
      : Object.values(groups).some((group) => group?.status === 'unavailable'));

  const {
    mediaType,
    hasActing,
    hasCrew,
    view,
    role,
    roles,
    sort,
    canonicalQuery,
    sortedMovies,
  } = getFilmographySelection(entries, searchParams, unavailable || partial);
  const resultsRef = useStablePanelHeight<HTMLDivElement>(
    `${mediaType}:${view}:${role}`
  );
  const query = searchParams.toString();

  let emptyMessage = i18n.t('ui.no_movie_credits_available');

  if (groups) {
    emptyMessage = partial
      ? i18n.t('ui.credits_for_this_selection_are_unavailable')
      : i18n.t('ui.no_credits_available_for_this_selection');
  }

  const jobOptions = [
    { value: '', label: i18n.t('ui.all_jobs') },
    ...roles.map((value) => ({
      value,
      label: value.startsWith('job:')
        ? value.slice(4)
        : i18n.t('messages.department', { department: value.slice(11) }),
    })),
  ];

  useEffect(() => {
    if (!unavailable && !partial && query !== canonicalQuery) {
      setSearchParams(canonicalQuery, { replace: true });
    }
  }, [query, canonicalQuery, setSearchParams, unavailable, partial]);

  const updateSelection = (name: string, value: string) => {
    const next = new URLSearchParams(searchParams);

    if (value) {
      next.set(name, value);
    } else {
      next.delete(name);
    }
    if (name === 'personView' || name === 'personType') {
      next.delete('personRole');
    }

    setSearchParams(next);
  };

  return (
    <section className="filmography" aria-labelledby="filmography-heading">
      <h2 id="filmography-heading">{i18n.t('ui.filmography')}</h2>
      {recovery}
      {groups && (
        <div
          className="filmography__media-tabs"
          role="group"
          aria-label={i18n.t('ui.filmography_media_type')}
        >
          {(['all', 'movie', 'tv'] as const).map((type) => (
            <button
              key={type}
              type="button"
              aria-pressed={mediaType === type}
              onClick={() =>
                updateSelection('personType', type === 'all' ? '' : type)
              }
            >
              {
                {
                  all: i18n.t('ui.all'),
                  movie: i18n.t('ui.movies'),
                  tv: i18n.t('ui.series'),
                }[type]
              }
            </button>
          ))}
        </div>
      )}
      {!unavailable &&
        (hasActing || hasCrew ? (
          <>
            <div className="filmography__controls">
              <div
                className="filmography__views"
                role="group"
                aria-label={i18n.t('ui.filmography_view')}
              >
                {hasActing && (
                  <button
                    type="button"
                    className="btn btn--outline"
                    aria-pressed={view === 'acting'}
                    onClick={() => updateSelection('personView', 'acting')}
                  >
                    {i18n.t('ui.acting')}
                  </button>
                )}
                {hasCrew && (
                  <button
                    type="button"
                    className="btn btn--outline"
                    aria-pressed={view === 'crew'}
                    onClick={() => updateSelection('personView', 'crew')}
                  >
                    {i18n.t('ui.crew')}
                  </button>
                )}
              </div>
              {view === 'crew' && (
                <div className="filmography__field">
                  <span>{i18n.t('ui.job_or_department')}</span>
                  <AnimatedSelect
                    label={i18n.t('ui.job_or_department')}
                    options={jobOptions}
                    value={role}
                    onChange={(value) => updateSelection('personRole', value)}
                  />
                </div>
              )}
              <div className="filmography__field">
                <span>{i18n.t('ui.sort_filmography')}</span>
                <AnimatedSelect
                  label={i18n.t('ui.sort_filmography')}
                  options={filmographySortOptions}
                  className="filmography__sort-select"
                  value={sort}
                  onChange={(value) => updateSelection('personSort', value)}
                />
              </div>
            </div>
            <div ref={resultsRef} className="tab-panel-stable">
              <FilmographyResults
                key={`${mediaType}:${view}:${role}:${sort}`}
                combined={Boolean(groups)}
                movies={sortedMovies}
                view={view}
                role={role}
              />
            </div>
          </>
        ) : (
          <p role="status">{emptyMessage}</p>
        ))}
    </section>
  );
}
