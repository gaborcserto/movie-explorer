import { useCallback } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa6';

import {
  getEpisode,
  getSeason,
  getEpisodeCredits,
  getSeries,
} from '../../util/apiUtils';
import { seriesPath } from '../../util/seriesRoutes';
import { record } from '../../util/partialValidation';
import { seasonDetails, seriesDetails } from '../../util/seriesValidation';
import parseDetailId from '../../util/detailId';
import CastPreview from '../../components/details/credits';
import { SectionRecovery } from '../../components/details/recovery';
import useSeriesResource from './useSeriesResource';
import parseSeasonNumber from './seriesCoordinates';
import '../../components/details/media/media.scss';
import {
  SeriesLayout,
  SeriesHero,
  EpisodeCrew,
  SeriesRequestState,
  SeriesBreadcrumbs,
} from './seriesPresentation';
import seasonName from './seriesNames';

function EpisodeDetails({
  idText,
  seasonText,
  episodeText,
}: {
  idText: string;
  seasonText: string;
  episodeText: string;
}) {
  const id = parseDetailId(idText);
  const seasonNumber = parseSeasonNumber(seasonText);
  const episodeNumber = parseDetailId(episodeText);
  const valid = [id, seasonNumber, episodeNumber].every(Number.isSafeInteger);
  const location = useLocation();
  const routeState: unknown = location.state;
  const initialSeries =
    record(routeState) && seriesDetails(routeState.series, id)
      ? routeState.series
      : undefined;
  const initialSeason =
    record(routeState) && seasonDetails(routeState.season, id, seasonNumber)
      ? routeState.season
      : undefined;
  const load = useCallback(
    (signal: AbortSignal) =>
      getEpisode(id, seasonNumber, episodeNumber, signal),
    [id, seasonNumber, episodeNumber]
  );
  const loadSeason = useCallback(
    (signal: AbortSignal) => getSeason(id, seasonNumber, signal),
    [id, seasonNumber]
  );
  const loadSeries = useCallback(
    (signal: AbortSignal) => getSeries(id, signal),
    [id]
  );
  const resource = useSeriesResource(load, valid);
  const parent = useSeriesResource(loadSeason, valid, initialSeason);
  const seriesResource = useSeriesResource(loadSeries, valid, initialSeries);
  const episode = resource.data;
  const season = parent.data;
  const series = seriesResource.data;
  const index =
    season?.episodes.findIndex(
      (item) => item.episodeNumber === episodeNumber
    ) ?? -1;
  const previous = index > 0 ? season?.episodes[index - 1] : undefined;
  const next = index >= 0 ? season?.episodes[index + 1] : undefined;

  const recover = async (signal: AbortSignal) => {
    const credits = await getEpisodeCredits(
      id,
      seasonNumber,
      episodeNumber,
      signal
    );

    if (!signal.aborted) {
      resource.setData(
        (current) =>
          current && {
            ...current,
            credits: {
              cast:
                credits.sections.cast.status === 'available'
                  ? credits.cast
                  : current.credits.cast,
              guestStars:
                credits.sections.guestStars.status === 'available'
                  ? credits.guestStars
                  : current.credits.guestStars,
              crew:
                credits.sections.crew.status === 'available'
                  ? credits.crew
                  : current.credits.crew,
              sections: {
                cast:
                  credits.sections.cast.status === 'available'
                    ? credits.sections.cast
                    : current.credits.sections.cast,
                guestStars:
                  credits.sections.guestStars.status === 'available'
                    ? credits.sections.guestStars
                    : current.credits.sections.guestStars,
                crew:
                  credits.sections.crew.status === 'available'
                    ? credits.sections.crew
                    : current.credits.sections.crew,
              },
            },
          }
      );
    }
  };

  return (
    <SeriesLayout
      title={episode?.title ?? 'Episode details'}
      hero={
        episode ? (
          <SeriesHero
            title={episode.title}
            rating={episode.rating}
            votes={episode.voteCount}
            showVoteCount={false}
            image={episode.stillUrl}
            srcSet={episode.stillSrcSet}
            className="episode-hero"
            still
          >
            <div className="series-detail__context">
              {valid && (
                <SeriesBreadcrumbs>
                  <li>
                    <Link className="text-link" to={seriesPath(idText)}>
                      {series?.title ?? `Series ${id}`}
                    </Link>
                  </li>
                  <li>
                    <Link
                      className="text-link"
                      to={seriesPath(idText, seasonText)}
                      state={{ series }}
                    >
                      {seasonName(seasonNumber)}
                    </Link>
                  </li>
                  <li>
                    <span aria-current="page">Episode {episodeNumber}</span>
                  </li>
                </SeriesBreadcrumbs>
              )}
              {(episode.airDate || episode.runtimeMinutes !== null) && (
                <p
                  className="series-detail__metadata"
                  aria-label="Episode details"
                >
                  {episode.airDate}
                  {episode.airDate && episode.runtimeMinutes !== null && ' · '}
                  {episode.runtimeMinutes !== null &&
                    `${episode.runtimeMinutes} min`}
                </p>
              )}
            </div>
            <section className="movie-details__section">
              <h2 className="movie-details__section-title">Overview</h2>
              <p className="movie-details__overview">
                {episode.description?.trim() ||
                  'No episode overview available.'}
              </p>
            </section>
          </SeriesHero>
        ) : (
          <SeriesRequestState {...resource} valid={valid} resource="Episode" />
        )
      }
    >
      {episode && (
        <>
          <nav aria-label="Episode navigation" className="series-neighbors">
            {previous && (
              <Link
                className="series-neighbors__previous"
                to={seriesPath(id, seasonNumber, previous.episodeNumber)}
                state={{ season, series }}
                aria-label={`Previous: ${previous.episodeNumber}. ${previous.title}`}
              >
                <span>
                  <FaChevronLeft aria-hidden="true" />
                  Previous Episode
                </span>
                <strong>
                  {previous.episodeNumber}. {previous.title}
                </strong>
              </Link>
            )}
            {next && (
              <Link
                className="series-neighbors__next"
                to={seriesPath(id, seasonNumber, next.episodeNumber)}
                state={{ season, series }}
                aria-label={`Next: ${next.episodeNumber}. ${next.title}`}
              >
                <span>
                  Next Episode
                  <FaChevronRight aria-hidden="true" />
                </span>
                <strong>
                  {next.episodeNumber}. {next.title}
                </strong>
              </Link>
            )}
          </nav>
          {parent.error !== undefined && (
            <p role="status">
              Episode navigation unavailable.{' '}
              <button
                type="button"
                className="btn btn--outline btn--action"
                onClick={parent.retry}
                disabled={parent.pending}
              >
                Retry season context
              </button>
            </p>
          )}
          <section
            className="series-section details-section"
            aria-labelledby="episode-credits-heading"
          >
            <div className="details-section__heading">
              <h2 id="episode-credits-heading">Episode credits</h2>
            </div>
            <div className="episode-credits">
              {(['cast', 'guestStars', 'crew'] as const).map((category) => {
                const labels = {
                  cast: 'Cast',
                  guestStars: 'Guest stars',
                  crew: 'Crew',
                };
                const people = episode.credits[category];

                return (
                  <section key={category}>
                    <h3>{labels[category]}</h3>
                    {category === 'crew' ? (
                      <EpisodeCrew people={episode.credits.crew} />
                    ) : (
                      <CastPreview
                        memberLabel={
                          category === 'guestStars' ? 'guest star' : 'cast'
                        }
                        members={episode.credits[category].map(
                          (person, position) => ({
                            ...person,
                            key: `${category}-${person.id ?? position}`,
                            roles: person.characters,
                          })
                        )}
                      />
                    )}
                    {episode.credits.sections[category].status ===
                      'available' &&
                      people.length === 0 && (
                        <p>No {labels[category].toLowerCase()} listed.</p>
                      )}
                    {episode.credits.sections[category].status ===
                      'unavailable' && <p>{labels[category]} unavailable.</p>}
                  </section>
                );
              })}
            </div>
            <SectionRecovery
              label="Episode credits"
              availability={
                Object.values(episode.credits.sections).some(
                  (section) => section.status === 'unavailable'
                )
                  ? { status: 'unavailable' }
                  : { status: 'available' }
              }
              recover={recover}
            />
          </section>
        </>
      )}
    </SeriesLayout>
  );
}

export default function EpisodePage() {
  const { id = '', seasonNumber = '', episodeNumber = '' } = useParams();

  return (
    <EpisodeDetails
      key={`${id}:${seasonNumber}:${episodeNumber}`}
      idText={id}
      seasonText={seasonNumber}
      episodeText={episodeNumber}
    />
  );
}
