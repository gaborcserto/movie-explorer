import { useTranslation } from 'react-i18next';
import { useCallback, useEffect } from 'react';
import { useParams } from 'react-router';

import { formatDate } from '../../i18n/format';
import { statusLabel } from '../../i18n/labels';
import { i18n } from '../../i18n';
import {
  getSeries,
  getSeriesImages,
  getSeriesVideos,
} from '../../util/apiUtils';
import WatchProviders, {
  useWatchProvidersResource,
} from '../../components/details/watchProviders';
import parseDetailId from '../../util/detailId';
import SeasonPreview from './seasonPreview';
import SeriesSections from './seriesSections';
import useSeriesResource from './hooks/useSeriesResource';
import { DetailSectionsSkeleton } from '../../components/skeleton';
import { useRatingsResource } from '../../components/details/ratings';
import {
  SeriesLayout,
  SeriesFacts,
  SeriesRequestState,
} from './seriesPresentation';
import SeriesHero from './seriesHero';
import SeriesMetadataList from './seriesMetadataList';
import ProductionCompanies from './productionCompanies';
import PersonalLibraryActions from '../../features/library/personalLibraryActions';
import { useLibraryStore } from '../../features/library/libraryStore';
import { EntityMetadata } from '../../components/routeMetadata';

function SeriesDetails({ idText }: { idText: string }) {
  useTranslation();

  const id = parseDetailId(idText);

  const load = useCallback(
    (signal: AbortSignal) => getSeries(id, signal),
    [id]
  );

  const resource = useSeriesResource(load, Number.isSafeInteger(id));
  const ratingResource = useRatingsResource(
    'series',
    id,
    Number.isSafeInteger(id)
  );

  const series = resource.data;
  const setResourceData = resource.setData;
  const seriesGenres =
    series?.genres.map((genre) => genre.trim()).filter(Boolean) ?? [];
  const firstAiredYear = series?.firstAirDate?.match(/^\d{4}/)?.[0];
  const updateSnapshot = useLibraryStore((state) => state.updateSnapshot);

  const recoverImages = useCallback(
    async (signal: AbortSignal) => {
      const images = await getSeriesImages(id, signal);

      if (!signal.aborted) {
        setResourceData((current) =>
          current ? { ...current, images } : current
        );
      }
    },
    [id, setResourceData]
  );

  const recoverVideos = useCallback(
    async (signal: AbortSignal) => {
      const videos = await getSeriesVideos(id, signal);

      if (!signal.aborted) {
        setResourceData((current) =>
          current ? { ...current, videos } : current
        );
      }
    },
    [id, setResourceData]
  );

  useEffect(() => {
    if (series) {
      updateSnapshot({
        mediaType: 'tv',
        id: series.id,
        title: series.title,
        posterUrl: series.posterUrl,
        firstAirDate: series.firstAirDate,
      });
    }
  }, [series, updateSnapshot]);

  const providerResource = useWatchProvidersResource(
    'series',
    id,
    Number.isSafeInteger(id)
  );

  return (
    <SeriesLayout
      title={series?.title ?? i18n.t('ui.series_details')}
      navigation={null}
      hero={
        series ? (
          <SeriesHero
            seriesId={series.id}
            title={series.title}
            rating={series.rating}
            votes={series.voteCount}
            ratingsValue={ratingResource.ratings}
            ratingsLoading={ratingResource.loading}
            showVoteCount={false}
            image={series.posterUrl}
            srcSet={series.posterSrcSet}
            className="series-page-hero"
            photos={series.images?.posters.map((poster, index) => ({
              ...poster,
              alt:
                poster.alt ??
                i18n.t('messages.posterNumber', {
                  number: index + 1,
                  title: series.title,
                }),
            }))}
          >
            <div className="series-hero-metadata">
              {seriesGenres.length > 0 && (
                <div className="movie-details__genre">
                  {seriesGenres.join(', ')}
                </div>
              )}
              <div className="movie-details__facts-actions">
                {(firstAiredYear ||
                  series.seasonCount !== null ||
                  series.episodeCount !== null) && (
                  <div className="movie-details__data">
                    {firstAiredYear && <span>{firstAiredYear}</span>}
                    {series.seasonCount !== null && (
                      <span>
                        {i18n.t('messages.seasons', {
                          count: series.seasonCount,
                        })}
                      </span>
                    )}
                    {series.episodeCount !== null && (
                      <span>
                        {i18n.t('messages.episodeCount', {
                          count: series.episodeCount,
                        })}
                      </span>
                    )}
                  </div>
                )}
                <PersonalLibraryActions
                  mediaType="tv"
                  id={series.id}
                  title={series.title}
                  posterUrl={series.posterUrl}
                  firstAirDate={series.firstAirDate}
                  presentation="expanded"
                />
              </div>
              <section className="movie-details__section">
                <h2 className="movie-details__section-title">
                  {i18n.t('ui.overview')}
                </h2>
                <p className="movie-details__overview">
                  {series.description ?? i18n.t('ui.no_overview_available')}
                </p>
              </section>
              <section className="movie-details__section series-information">
                <h2 className="movie-details__section-title">
                  {i18n.t('ui.series_information')}
                </h2>
                <SeriesFacts
                  hero
                  facts={[
                    [
                      i18n.t('ui.last_aired'),
                      series.lastAirDate
                        ? formatDate(series.lastAirDate)
                        : null,
                    ],
                    [i18n.t('ui.status'), statusLabel(series.status)],
                    [
                      i18n.t('ui.original_title'),
                      series.originalTitle !== series.title
                        ? series.originalTitle
                        : null,
                    ],
                    [
                      i18n.t('ui.episode_runtime'),
                      series.episodeRuntimeMinutes.length
                        ? i18n.t('messages.runtimeList', {
                            minutes: series.episodeRuntimeMinutes.join(', '),
                          })
                        : null,
                    ],
                    [i18n.t('ui.original_language'), series.originalLanguage],
                    [
                      i18n.t('ui.origin_countries'),
                      series.originCountries.join(', '),
                    ],
                    [
                      i18n.t('ui.creators'),
                      series.creators.length ? (
                        <SeriesMetadataList
                          key="creators"
                          label={i18n.t('ui.creators')}
                          people={series.creators}
                          linked
                        />
                      ) : null,
                    ],
                    [
                      i18n.t('ui.networks'),
                      series.networks.length ? (
                        <SeriesMetadataList
                          key="networks"
                          label={i18n.t('ui.networks')}
                          people={series.networks}
                        />
                      ) : null,
                    ],
                    [
                      i18n.t('ui.production_companies'),
                      series.productionCompanies.length ? (
                        <ProductionCompanies
                          companies={series.productionCompanies}
                        />
                      ) : null,
                    ],
                  ]}
                />
              </section>
              <WatchProviders
                providers={providerResource.providers}
                resource={providerResource}
              />
            </div>
          </SeriesHero>
        ) : (
          <SeriesRequestState
            {...resource}
            valid={Number.isSafeInteger(id)}
            resource="Series"
          />
        )
      }
    >
      {resource.pending && !series && <DetailSectionsSkeleton />}
      {series && (
        <>
          <EntityMetadata kind="series" data={series} />
          <SeriesSections
            key={series.id}
            series={series}
            recoverImages={recoverImages}
            recoverVideos={recoverVideos}
          />
          <section
            aria-labelledby="seasons-heading"
            className="details-section"
          >
            <div className="details-section__heading">
              <h2 id="seasons-heading">{i18n.t('ui.seasons')}</h2>
            </div>
            <SeasonPreview key={series.id} series={series} />
          </section>
        </>
      )}
    </SeriesLayout>
  );
}

export default function SeriesPage() {
  useTranslation();

  const { id = '' } = useParams();

  return <SeriesDetails key={id} idText={id} />;
}
