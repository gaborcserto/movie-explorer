import { useCallback } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';

import { getSeason, getSeries } from '../../util/apiUtils';
import { record } from '../../util/partialValidation';
import { seriesDetails } from '../../util/seriesValidation';
import parseDetailId from '../../util/detailId';
import MovieImage from '../../components/utility/customImage';
import useSeriesResource from './useSeriesResource';
import parseSeasonNumber from './seriesCoordinates';
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
    <SeriesLayout title={season?.title ?? 'Season details'}>
      <SeriesBreadcrumbs>
        <Link to={`/tv/${idText}`}>{series?.title ?? 'Series details'}</Link>
      </SeriesBreadcrumbs>
      {season ? (
        <>
          <SeriesHero
            title={season.title}
            image={season.posterUrl}
            srcSet={season.posterSrcSet}
          >
            <p>
              <SeasonName number={number} />
            </p>
            <SeriesFacts
              facts={[
                ['Air date', season.airDate],
                ['Returned episodes', season.episodeCount],
              ]}
            />
            <p className="series-overview">
              {season.description ?? 'No season overview available.'}
            </p>
          </SeriesHero>
          {series && series.seasons.length > 0 && (
            <div className="series-season-selector">
              <label htmlFor="season-select">Season</label>
              <select
                id="season-select"
                value={number}
                onChange={(event) =>
                  navigate(`/tv/${id}/seasons/${event.target.value}`, {
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
            className="series-section"
            aria-labelledby="episodes-heading"
          >
            <h2 id="episodes-heading">Episodes</h2>
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
                        to={`/tv/${id}/seasons/${number}/episodes/${episode.episodeNumber}`}
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
      ) : (
        <SeriesRequestState {...resource} valid={valid} resource="Season" />
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
