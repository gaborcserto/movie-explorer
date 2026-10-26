import { useCallback } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';

import { getSeason, getSeries } from '../../util/apiUtils';
import { seriesPath } from '../../util/seriesRoutes';
import { record } from '../../util/partialValidation';
import { seriesDetails } from '../../util/seriesValidation';
import parseDetailId from '../../util/detailId';
import MovieImage from '../../components/utility/customImage';
import useSeriesResource from './useSeriesResource';
import parseSeasonNumber from './seriesCoordinates';
import '../../components/details/media/media.scss';
import {
  SeriesLayout,
  SeriesHero,
  SeriesFacts,
  SeriesRating,
  SeriesRequestState,
  SeriesBreadcrumbs,
  SeasonName,
} from './seriesPresentation';

function SeasonDetails({
  idText,
  seasonText,
}: {
  idText: string;
  seasonText: string;
}) {
  const id = parseDetailId(idText);
  const number = parseSeasonNumber(seasonText);
  const valid = Number.isSafeInteger(id) && Number.isSafeInteger(number);
  const location = useLocation();
  const navigate = useNavigate();
  const routeState: unknown = location.state;
  const initialSeries =
    record(routeState) && seriesDetails(routeState.series, id)
      ? routeState.series
      : undefined;
  const load = useCallback(
    (signal: AbortSignal) => getSeason(id, number, signal),
    [id, number]
  );
  const loadSeries = useCallback(
    (signal: AbortSignal) => getSeries(id, signal),
    [id]
  );
  const resource = useSeriesResource(load, valid);
  const parent = useSeriesResource(loadSeries, valid, initialSeries);
  const season = resource.data;
  const series = parent.data;

  return (
    <SeriesLayout
      title={season?.title ?? 'Season details'}
      backdrop={series?.backdropUrl}
      navigation={
        <SeriesBreadcrumbs>
          <Link to={seriesPath(idText)}>
            {series?.title ?? 'Series details'}
          </Link>
        </SeriesBreadcrumbs>
      }
      hero={
        season ? (
          <SeriesHero
            title={season.title}
            image={season.posterUrl}
            srcSet={season.posterSrcSet}
          >
            <p>
              <SeasonName number={number} />
            </p>
            <SeriesFacts
              hero
              facts={[
                ['First aired', season.airDate],
                ['Episodes', season.episodeCount],
              ]}
            />
            <section className="movie-details__section">
              <h2 className="movie-details__section-title">Overview</h2>
              <p className="movie-details__overview">
                {season.description ?? 'No season overview available.'}
              </p>
            </section>
          </SeriesHero>
        ) : (
          <SeriesRequestState {...resource} valid={valid} resource="Season" />
        )
      }
    >
      {season && (
        <>
          {series && series.seasons.length > 0 && (
            <div className="series-season-selector">
              <label htmlFor="season-select">Season</label>
              <select
                id="season-select"
                value={number}
                onChange={(event) =>
                  navigate(seriesPath(id, event.target.value), {
                    state: { series },
                  })
                }
              >
                {!series.seasons.some(
                  (item) => item.seasonNumber === number
                ) && <option value={number}>{season.title}</option>}
                {series.seasons.map((item) => (
                  <option key={item.id} value={item.seasonNumber}>
                    {item.seasonNumber === 0
                      ? 'Specials'
                      : `Season ${item.seasonNumber}`}
                    : {item.title}
                  </option>
                ))}
              </select>
            </div>
          )}
          {parent.error !== undefined && (
            <p role="status">
              Series context unavailable.{' '}
              <button
                type="button"
                className="btn btn--outline btn--action"
                onClick={parent.retry}
                disabled={parent.pending}
              >
                Retry series context
              </button>
            </p>
          )}
          <section
            className="series-section details-section"
            aria-labelledby="episodes-heading"
          >
            <div className="details-section__heading">
              <h2 id="episodes-heading">Episodes</h2>
            </div>
            {!season.episodes.length && (
              <p>No episodes available for this season yet.</p>
            )}
            <ol className="series-episodes">
              {season.episodes.map((episode) => (
                <li key={episode.id} value={episode.episodeNumber}>
                  <MovieImage
                    src={episode.stillUrl ?? undefined}
                    alt=""
                    className="series-episode-still"
                  />
                  <div>
                    <h3>
                      <Link
                        to={seriesPath(id, number, episode.episodeNumber)}
                        state={{ season, series }}
                      >
                        {episode.episodeNumber}. {episode.title}
                      </Link>
                    </h3>
                    <SeriesFacts
                      facts={[
                        ['Air date', episode.airDate],
                        [
                          'Runtime',
                          episode.runtimeMinutes === null
                            ? null
                            : `${episode.runtimeMinutes} min`,
                        ],
                      ]}
                    />
                    {episode.description && (
                      <p className="series-excerpt">{episode.description}</p>
                    )}
                    <SeriesRating
                      rating={episode.rating}
                      votes={episode.voteCount}
                    />
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </SeriesLayout>
  );
}

export default function SeasonPage() {
  const { id = '', seasonNumber = '' } = useParams();

  return (
    <SeasonDetails
      key={`${id}:${seasonNumber}`}
      idText={id}
      seasonText={seasonNumber}
    />
  );
}
