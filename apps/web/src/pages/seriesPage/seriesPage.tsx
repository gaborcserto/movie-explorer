import { useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';

import {
  getSeries,
  getSeriesImages,
  getSeriesVideos,
} from '../../util/apiUtils';
import WatchProviders from '../../components/details/watchProviders';
import useWatchProvidersResource from '../../components/details/useWatchProvidersResource';
import parseDetailId from '../../util/detailId';
import SeasonPreview from './seasonPreview';
import SeriesSections from './seriesSections';
import useSeriesResource from './useSeriesResource';
import { DetailSectionsSkeleton } from '../../components/skeleton';
import useRatingsResource from '../../components/details/useRatingsResource';
import {
  SeriesLayout,
  SeriesHero,
  SeriesFacts,
  SeriesMetadataList,
  ProductionCompanies,
  SeriesRequestState,
} from './seriesPresentation';
import PersonalLibraryActions from '../../features/library/personalLibraryActions';
import { useLibraryStore } from '../../features/library/libraryStore';

function SeriesDetails({ idText }: { idText: string }) {
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
      title={series?.title ?? 'Series details'}
      navigation={null}
      hero={
        series ? (
          <SeriesHero
            seriesId={series.id}
            title={series.title}
            rating={series.rating}
            votes={series.voteCount}
            ratingsValue={ratingResource.ratings}
            ratingsError={ratingResource.error}
            ratingsLoading={ratingResource.loading}
            retryRatings={ratingResource.retry}
            showVoteCount={false}
            image={series.posterUrl}
            srcSet={series.posterSrcSet}
            className="series-page-hero"
            photos={series.images?.posters.map((poster, index) => ({
              ...poster,
              alt: poster.alt ?? `Poster ${index + 1} for ${series.title}`,
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
                      <span>{series.seasonCount} seasons</span>
                    )}
                    {series.episodeCount !== null && (
                      <span>{series.episodeCount} episodes</span>
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
                <h2 className="movie-details__section-title">Overview</h2>
                <p className="movie-details__overview">
                  {series.description ?? 'No overview available.'}
                </p>
              </section>
              <section className="movie-details__section series-information">
                <h2 className="movie-details__section-title">
                  Series Information
                </h2>
                <SeriesFacts
                  hero
                  facts={[
                    ['Last aired', series.lastAirDate],
                    ['Status', series.status],
                    [
                      'Original title',
                      series.originalTitle !== series.title
                        ? series.originalTitle
                        : null,
                    ],
                    [
                      'Episode runtime',
                      series.episodeRuntimeMinutes.length
                        ? `${series.episodeRuntimeMinutes.join(', ')} min`
                        : null,
                    ],
                    ['Original language', series.originalLanguage],
                    ['Origin countries', series.originCountries.join(', ')],
                    [
                      'Creators',
                      series.creators.length ? (
                        <SeriesMetadataList
                          key="creators"
                          label="Creators"
                          people={series.creators}
                          linked
                        />
                      ) : null,
                    ],
                    [
                      'Networks',
                      series.networks.length ? (
                        <SeriesMetadataList
                          key="networks"
                          label="Networks"
                          people={series.networks}
                        />
                      ) : null,
                    ],
                    [
                      'Production companies',
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
              <h2 id="seasons-heading">Seasons</h2>
            </div>
            <SeasonPreview key={series.id} series={series} />
          </section>
        </>
      )}
    </SeriesLayout>
  );
}

export default function SeriesPage() {
  const { id = '' } = useParams();

  return <SeriesDetails key={id} idText={id} />;
}
