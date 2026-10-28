import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { SeriesDetails } from '@movie-explorer/contracts';

import MovieImage from '../../components/utility/customImage';
import { getPosterDisplaySrcSet } from '../../util/imageSizing';
import { seriesPath } from '../../util/seriesRoutes';
import { SeasonName, SeriesFacts } from './seriesPresentation';

function measureScroll(container: HTMLDivElement) {
  const maxScroll = container.scrollWidth - container.clientWidth;

  return {
    overflow: maxScroll > 1,
    atStart: container.scrollLeft <= 1,
    atEnd: container.scrollLeft >= maxScroll - 1,
  };
}

export default function SeasonPreview({ series }: { series: SeriesDetails }) {
  const id = useId();
  const [selected, setSelected] = useState(0);
  const tabs = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({
    overflow: false,
    atStart: true,
    atEnd: true,
  });
  const season = series.seasons[selected];

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
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-tab-${season.seasonNumber}`}
        tabIndex={0}
        className="season-preview"
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
          <h3>
            <SeasonName number={season.seasonNumber} title={season.title} />
          </h3>
          <SeriesFacts
            facts={[
              ['Air date', season.airDate],
              ['Episodes', season.episodeCount],
            ]}
          />
          {season.description && (
            <p className="season-preview__overview">{season.description}</p>
          )}
          <Link
            className="btn btn--outline btn--action"
            to={seriesPath(series.id, season.seasonNumber)}
            state={{ series }}
          >
            View episodes
          </Link>
        </div>
      </div>
    </>
  );
}
