import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';
import { Link, useLocation, useParams } from 'react-router';

import { i18n } from '../../i18n';
import { getSeason, getSeries } from '../../util/apiUtils';
import { seriesPath } from '../../util/seriesRoutes';
import { record } from '../../util/partialValidation';
import { seasonDetails, seriesDetails } from '../../util/seriesValidation';
import parseDetailId from '../../util/detailId';
import EpisodeList from './episodeList';
import useSeriesResource from './hooks/useSeriesResource';
import parseSeasonNumber from './seriesCoordinates';
import '../../components/details/media/media.scss';
import {
  SeriesLayout,
  SeriesRequestState,
  SeriesBreadcrumbs,
} from './seriesPresentation';
import SeriesHero from './seriesHero';
import SeasonSelector from './seasonSelector';
import seasonName from './seriesNames';

function SeasonDetails({
  idText,
  seasonText,
}: {
  idText: string;
  seasonText: string;
}) {
  useTranslation();

  const id = parseDetailId(idText);
  const number = parseSeasonNumber(seasonText);
  const valid = Number.isSafeInteger(id) && Number.isSafeInteger(number);
  const location = useLocation();
  const routeState: unknown = location.state;
  const initialSeason =
    record(routeState) && seasonDetails(routeState.season, id, number)
      ? routeState.season
      : undefined;
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

  const resource = useSeriesResource(load, valid, initialSeason);
  const parent = useSeriesResource(loadSeries, valid, initialSeries);

  const season = resource.data;
  const series = parent.data;

  return (
    <SeriesLayout
      title={season?.title ?? i18n.t('ui.season_details')}
      navigation={null}
      hero={
        season ? (
          <SeriesHero
            title={season.title}
            image={season.posterUrl}
            srcSet={season.posterSrcSet}
            imageSizes="(max-width: 991.98px) calc(100vw - 52px), (max-width: 1199.98px) calc(100vw - 72px), 320px"
            className="season-hero"
          >
            <div className="series-detail__context">
              {valid && (
                <SeriesBreadcrumbs>
                  <li>
                    <Link className="text-link" to={seriesPath(idText)}>
                      {series?.title ?? i18n.t('ui.series_details')}
                    </Link>
                  </li>
                  <li>
                    <span aria-current="page">{seasonName(number)}</span>
                  </li>
                </SeriesBreadcrumbs>
              )}
              <p
                className="series-detail__metadata"
                aria-label={i18n.t('ui.season_information')}
              >
                {season.airDate && (
                  <span>
                    {/^(\d{4})/.exec(season.airDate)?.[1] ?? season.airDate}
                  </span>
                )}
                <span>
                  {season.episodeCount} {i18n.t('ui.episodes')}
                </span>
              </p>
            </div>
            <section className="movie-details__section">
              <h2 className="movie-details__section-title">
                {i18n.t('ui.overview')}
              </h2>
              <p className="movie-details__overview">
                {season.description?.trim() ||
                  i18n.t('ui.no_season_overview_available')}
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
            <SeasonSelector
              seriesId={id}
              series={series}
              seasons={series.seasons}
              currentSeason={season}
            />
          )}
          {parent.error !== undefined && (
            <p role="status">
              {i18n.t('ui.series_context_unavailable')}{' '}
              <button
                type="button"
                className="btn btn--outline btn--action"
                onClick={parent.retry}
                disabled={parent.pending}
              >
                {i18n.t('ui.retry_series_context')}
              </button>
            </p>
          )}
          <section
            className="series-section details-section"
            aria-labelledby="episodes-heading"
          >
            <div className="details-section__heading">
              <h2 id="episodes-heading">{i18n.t('ui.episodes')}</h2>
            </div>
            {!season.episodes.length && (
              <p>{i18n.t('ui.no_episodes_available_for_this_season_yet')}</p>
            )}
            <EpisodeList
              seriesId={id}
              seasonNumber={number}
              episodes={season.episodes}
              season={season}
              series={series}
            />
          </section>
        </>
      )}
    </SeriesLayout>
  );
}

export default function SeasonPage() {
  useTranslation();

  const { id = '', seasonNumber = '' } = useParams();

  return (
    <SeasonDetails
      key={`${id}:${seasonNumber}`}
      idText={id}
      seasonText={seasonNumber}
    />
  );
}
