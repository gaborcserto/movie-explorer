import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getSeries } from '../../util/apiUtils';
import parseDetailId from '../../util/detailId';
import MovieImage from '../../components/utility/customImage';
import { getPosterDisplaySrcSet } from '../../util/imageSizing';
import useSeriesResource from './useSeriesResource';
import {
  SeriesLayout,
  SeriesHero,
  SeriesFacts,
  SeriesRating,
  SeriesPeople,
  SeriesRequestState,
  SeasonName,
} from './seriesPresentation';

function SeriesDetails({ idText }: { idText: string }) {
  const id = parseDetailId(idText);
  const load = useCallback(
    (signal: AbortSignal) => getSeries(id, signal),
    [id]
  );
  const resource = useSeriesResource(load, Number.isSafeInteger(id));
  const [expanded, setExpanded] = useState(false);
  const series = resource.data;
  const regular =
    series?.seasons.filter((season) => season.seasonNumber !== 0) ?? [];
  const specials =
    series?.seasons.filter((season) => season.seasonNumber === 0) ?? [];

  return (
    <SeriesLayout title={series?.title ?? 'Series details'}>
      {series ? (
        <>
          <div className="series-series-hero">
            {series.backdropUrl && (
              <img
                className="series-series-hero__backdrop"
                src={series.backdropUrl}
                alt=""
                decoding="async"
              />
            )}
            <SeriesHero
              title={series.title}
              image={series.posterUrl}
              srcSet={series.posterSrcSet}
            >
              {series.originalTitle &&
                series.originalTitle !== series.title && (
                  <p className="series-original-title">
                    {series.originalTitle}
                  </p>
                )}
              <SeriesFacts
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
              <SeriesRating rating={series.rating} votes={series.voteCount} />
              <h2>Overview</h2>
              <p className="series-overview">
                {series.description ?? 'No overview available.'}
              </p>
              {series.creators.length > 0 && (
                <section>
                  <h2>Creators</h2>
                  <SeriesPeople people={series.creators} />
                </section>
              )}
              <SeriesFacts
                facts={[
                  [
                    'Networks',
                    series.networks.map((network) => network.name).join(', '),
                  ],
                  [
                    'Production companies',
                    series.productionCompanies
                      .map((company) => company.name)
                      .join(', '),
                  ],
                ]}
              />
            </SeriesHero>
          </div>
          <section aria-labelledby="seasons-heading" className="series-section">
            <h2 id="seasons-heading">Seasons</h2>
            {!series.seasons.length && <p>No season information available.</p>}
            <ul className="series-seasons">
              {[...(expanded ? regular : regular.slice(0, 6)), ...specials].map(
                (season) => (
                  <li key={season.id}>
                    <MovieImage
                      src={season.posterUrl ?? undefined}
                      srcSet={getPosterDisplaySrcSet(
                        season.posterUrl ?? undefined,
                        season.posterSrcSet
                      )}
                      alt=""
                      className="series-season-poster"
                    />
                    <div>
                      <h3>
                        <Link
                          to={`/tv/${id}/seasons/${season.seasonNumber}`}
                          state={{ series }}
                        >
                          <SeasonName
                            number={season.seasonNumber}
                            title={season.title}
                          />
                        </Link>
                      </h3>
                      <SeriesFacts
                        facts={[
                          ['Air date', season.airDate],
                          ['Advertised episodes', season.episodeCount],
                        ]}
                      />
                      {season.description && (
                        <p className="series-excerpt">{season.description}</p>
                      )}
                    </div>
                  </li>
                )
              )}
            </ul>
            {regular.length > 6 && (
              <button
                type="button"
                className="btn btn--outline btn--action"
                aria-expanded={expanded}
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? 'Show fewer seasons' : 'Show all seasons'}
              </button>
            )}
          </section>
        </>
      ) : (
        <SeriesRequestState
          {...resource}
          valid={Number.isSafeInteger(id)}
          resource="Series"
        />
      )}
    </SeriesLayout>
  );
}

export default function SeriesPage() {
  const { id = '' } = useParams();

  return <SeriesDetails key={id} idText={id} />;
}
