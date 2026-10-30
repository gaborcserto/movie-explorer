import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { SeriesDetails } from '@movie-explorer/contracts';

import MovieImage from '../../components/utility/customImage';
import useStablePanelHeight from '../../hooks/useStablePanelHeight';
import { getPosterDisplaySrcSet } from '../../util/imageSizing';
import { seriesPath } from '../../util/seriesRoutes';
import { getSeason } from '../../util/apiUtils';
import { SeasonName } from './seriesPresentation';
import EpisodeList from './episodeList';
import useSeriesResource from './useSeriesResource';

function measureScroll(container: HTMLDivElement) {
  const maxScroll = container.scrollWidth - container.clientWidth;

  return {
    overflow: maxScroll > 1,
    atStart: container.scrollLeft <= 1,
    atEnd: container.scrollLeft >= maxScroll - 1,
  };
}

function findSeasonIndex(
  seasons: SeriesDetails['seasons'],
  seasonText: string | null
) {
  if (seasonText === null || !/^\d+$/.test(seasonText)) {
    return -1;
  }

  const seasonNumber = Number(seasonText);

  if (!Number.isSafeInteger(seasonNumber)) {
    return -1;
  }

  return seasons.findIndex((season) => season.seasonNumber === seasonNumber);
}

function getDefaultSeasonIndex(
  seasons: SeriesDetails['seasons'],
  requestedSeason: string | null
) {
  const requestedIndex = findSeasonIndex(seasons, requestedSeason);

  if (requestedIndex >= 0) {
    return requestedIndex;
  }

  const firstRegularSeason = seasons
    .map((season, index) => ({ index, seasonNumber: season.seasonNumber }))
    .filter(({ seasonNumber }) => seasonNumber > 0)
    .sort((a, b) => a.seasonNumber - b.seasonNumber)[0];

  if (firstRegularSeason) {
    return firstRegularSeason.index;
  }

  const specialsIndex = seasons.findIndex(
    (season) => season.seasonNumber === 0
  );

  return specialsIndex >= 0 ? specialsIndex : 0;
}

export default function SeasonPreview({ series }: { series: SeriesDetails }) {
  const id = useId();
  const [searchParams] = useSearchParams();
  const requestedSeason = searchParams.get('season');
  const [selected, setSelected] = useState(() =>
    getDefaultSeasonIndex(series.seasons, requestedSeason)
  );
  const tabs = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({
    overflow: false,
    atStart: true,
    atEnd: true,
  });
  const season = series.seasons[selected];
  const previewRef = useStablePanelHeight<HTMLDivElement>(
    `${series.id}:${season?.seasonNumber ?? selected}`
  );
  const seasonYear = season?.airDate?.match(/^\d{4}/)?.[0] ?? null;

  const loadSeason = useCallback(
    (signal: AbortSignal) =>
      getSeason(series.id, season?.seasonNumber ?? 0, signal),
    [series.id, season?.seasonNumber]
  );
  const seasonResource = useSeriesResource(loadSeason, Boolean(season));
  const selectedSeason =
    seasonResource.data?.seasonNumber === season?.seasonNumber
      ? seasonResource.data
      : season;

  useEffect(() => {
    const container = tabs.current;

    if (!container) {
      return undefined;
    }

    const measure = () => setScrollState(measureScroll(container));

    measure();
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(measure);
    observer?.observe(container);
    container
      .querySelectorAll('[role="tab"]')
      .forEach((tab) => observer?.observe(tab));
    if (container.parentElement) {
      observer?.observe(container.parentElement);
    }

    return () => {
      observer?.disconnect();
    };
  }, [series.seasons.length]);

  if (!season) {
    return <p>No season information available.</p>;
  }

  function select(index: number) {
    setSelected(index);
    const tab = tabs.current?.querySelectorAll('button')[index];
    tab?.focus({ preventScroll: true });
    if (tab && tabs.current) {
      const tabRect = tab.getBoundingClientRect();
      const listRect = tabs.current.getBoundingClientRect();

      if (tabRect.left < listRect.left) {
        tabs.current.scrollLeft += tabRect.left - listRect.left;
      } else if (tabRect.right > listRect.right) {
        tabs.current.scrollLeft += tabRect.right - listRect.right;
      }
    }
  }

  return (
    <>
      <div
        className={`season-tabs-navigation${scrollState.overflow ? ' season-tabs-navigation--overflow' : ''}`}
      >
        {scrollState.overflow && (
          <button
            type="button"
            className="btn btn--outline"
            aria-label="Previous season"
            disabled={scrollState.atStart}
            onClick={() => {
              if (tabs.current) {
                tabs.current.scrollLeft -= tabs.current.clientWidth * 0.75;
              }
            }}
          >
            ‹
          </button>
        )}
        <div
          ref={tabs}
          role="tablist"
          tabIndex={-1}
          aria-label="Seasons"
          className="season-tabs"
          onScroll={() => {
            const container = tabs.current;

            if (container) {
              setScrollState(measureScroll(container));
            }
          }}
          onKeyDown={(event) => {
            let next: number;

            if (event.key === 'ArrowRight') {
              next = (selected + 1) % series.seasons.length;
            } else if (event.key === 'ArrowLeft') {
              next =
                (selected - 1 + series.seasons.length) % series.seasons.length;
            } else if (event.key === 'Home') {
              next = 0;
            } else if (event.key === 'End') {
              next = series.seasons.length - 1;
            } else {
              return;
            }

            event.preventDefault();
            select(next);
          }}
        >
          {series.seasons.map((item, index) => (
            <button
              type="button"
              role="tab"
              id={`${id}-tab-${item.seasonNumber}`}
              key={item.seasonNumber}
              aria-selected={index === selected}
              aria-controls={`${id}-panel`}
              aria-label={
                item.seasonNumber === 0
                  ? 'Specials, Season 0'
                  : `Season ${item.seasonNumber}`
              }
              tabIndex={index === selected ? 0 : -1}
              onClick={() => select(index)}
            >
              {item.seasonNumber === 0 ? 'Specials' : item.seasonNumber}
            </button>
          ))}
        </div>
        {scrollState.overflow && (
          <button
            type="button"
            className="btn btn--outline"
            aria-label="Next season"
            disabled={scrollState.atEnd}
            onClick={() => {
              if (tabs.current) {
                tabs.current.scrollLeft += tabs.current.clientWidth * 0.75;
              }
            }}
          >
            ›
          </button>
        )}
      </div>
      <div
        ref={previewRef}
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-tab-${season.seasonNumber}`}
        tabIndex={0}
        className="season-preview tab-panel-stable"
      >
        <MovieImage
          src={season.posterUrl ?? undefined}
          srcSet={getPosterDisplaySrcSet(
            season.posterUrl ?? undefined,
            season.posterSrcSet
          )}
          alt={`Poster for ${season.title}`}
          className="series-season-poster"
        />
        <div>
          <div className="season-preview__header">
            <h3>
              <SeasonName number={season.seasonNumber} />
            </h3>
            {(seasonYear || season.episodeCount !== null) && (
              <p className="season-preview__facts">
                {seasonYear && (
                  <span className="season-preview__year">{seasonYear}</span>
                )}
                {seasonYear && season.episodeCount !== null && (
                  <span
                    className="season-preview__separator"
                    aria-hidden="true"
                  >
                    ·
                  </span>
                )}
                {season.episodeCount !== null && (
                  <span className="season-preview__episode-count">
                    {season.episodeCount}{' '}
                    {season.episodeCount === 1 ? 'Episode' : 'Episodes'}
                  </span>
                )}
              </p>
            )}
          </div>
          {selectedSeason?.description?.trim() && (
            <p className="season-preview__overview">
              {selectedSeason.description}
            </p>
          )}
          <div className="season-preview__actions">
            <Link
              className="btn btn--outline btn--action"
              to={seriesPath(series.id, season.seasonNumber)}
              state={{
                series,
                season:
                  seasonResource.data?.seasonNumber === season.seasonNumber
                    ? seasonResource.data
                    : undefined,
              }}
            >
              View season details
            </Link>
          </div>
        </div>
        <section
          className="season-preview__episodes"
          aria-labelledby={`${id}-episodes-heading`}
        >
          <h4 id={`${id}-episodes-heading`}>Episodes</h4>
          {seasonResource.pending && <p role="status">Loading episodes…</p>}
          {seasonResource.error !== undefined && (
            <p role="status">
              Episodes unavailable.{' '}
              <button
                type="button"
                onClick={seasonResource.retry}
                disabled={seasonResource.pending}
              >
                Retry
              </button>
            </p>
          )}
          {seasonResource.data?.seasonNumber === season.seasonNumber &&
            !seasonResource.data.episodes.length && (
              <p>No episodes available for this season yet.</p>
            )}
          {seasonResource.data?.seasonNumber === season.seasonNumber &&
            seasonResource.data.episodes.length > 0 && (
              <EpisodeList
                seriesId={series.id}
                seasonNumber={season.seasonNumber}
                episodes={seasonResource.data.episodes}
                season={seasonResource.data}
                series={series}
              />
            )}
        </section>
      </div>
    </>
  );
}
