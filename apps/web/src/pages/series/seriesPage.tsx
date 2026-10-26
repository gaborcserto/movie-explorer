import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { WatchProvider } from '@movie-explorer/contracts';

import { getSeries, getWatchProviders } from '../../util/apiUtils';
import WatchProviders from '../../components/details/watchProviders';
import parseDetailId from '../../util/detailId';
import SeasonPreview from './seasonPreview';
import SeriesSections from './seriesSections';
import useSeriesResource from './useSeriesResource';
import {
  SeriesLayout,
  SeriesHero,
  SeriesFacts,
  SeriesMetadataList,
  ProductionCompanies,
  SeriesRequestState,
} from './seriesPresentation';

function SeriesDetails({ idText }: { idText: string }) {
  const id = parseDetailId(idText);
  const load = useCallback(
    (signal: AbortSignal) => getSeries(id, signal),
    [id]
  );
  const resource = useSeriesResource(load, Number.isSafeInteger(id));
  const series = resource.data;
  const seriesId = series?.id;
  const [watchProviders, setWatchProviders] = useState<WatchProvider[]>([]);
  useEffect(() => {
    if (seriesId === undefined) return undefined;
    const controller = new AbortController();
    setWatchProviders([]);
    Promise.resolve()
      .then(() => getWatchProviders('series', id, controller.signal))
      .then(({ providers }) => {
        if (!controller.signal.aborted) setWatchProviders(providers);
      })
      .catch(() => {
        if (!controller.signal.aborted) setWatchProviders([]);
      });
    return () => controller.abort();
  }, [id, seriesId]);

  return (
    <SeriesLayout
      title={series?.title ?? 'Series details'}
      backdrop={series?.backdropUrl}
      navigation={null}
      hero={
        series ? (
          <SeriesHero
            title={series.title}
            rating={series.rating}
            votes={series.voteCount}
            image={series.posterUrl}
            srcSet={series.posterSrcSet}
          >
            <div className="series-hero-metadata">
              {series.originalTitle &&
                series.originalTitle !== series.title && (
                  <p className="series-original-title">
                    {series.originalTitle}
                  </p>
                )}
              <SeriesFacts
                hero
                facts={[
                  ['First aired', series.firstAirDate],
                  ['Last aired', series.lastAirDate],
                  ['Status', series.status],
                  ['Genres', series.genres.join(', ')],
                  ['Seasons', series.seasonCount],
                  ['Episodes', series.episodeCount],
                  [
                    'Episode runtime',
                    series.episodeRuntimeMinutes.length
                      ? `${series.episodeRuntimeMinutes.join(', ')} min`
                      : null,
                  ],
                  ['Original language', series.originalLanguage],
                  ['Origin countries', series.originCountries.join(', ')],
                ]}
              />
              <WatchProviders providers={watchProviders} />
              <section className="movie-details__section">
                <h2 className="movie-details__section-title">Overview</h2>
                <p className="movie-details__overview">
                  {series.description ?? 'No overview available.'}
                </p>
              </section>
              <SeriesFacts
                hero
                facts={[
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
      {series && (
        <>
          <SeriesSections key={series.id} series={series} />
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
