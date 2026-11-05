import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router';
import type { SeasonSummary, SeriesDetails } from '@movie-explorer/contracts';

import { seriesPath } from '../../../util/seriesRoutes';
import seasonName from '../seriesNames';

export default function SeasonSelector({
  seriesId,
  series,
  seasons,
  currentSeason,
}: {
  seriesId: number;
  series: SeriesDetails;
  seasons: SeasonSummary[];
  currentSeason: SeasonSummary;
}) {
  const [open, setOpen] = useState(false);
  const selectorId = useId();
  const selectorRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const availableSeasons = seasons.some(
    (season) => season.seasonNumber === currentSeason.seasonNumber
  )
    ? seasons
    : [...seasons, currentSeason];

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !selectorRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div className="series-season-selector" ref={selectorRef}>
      <button
        ref={triggerRef}
        type="button"
        className="series-season-selector__trigger"
        aria-expanded={open}
        aria-controls={selectorId}
        onClick={() => setOpen((value) => !value)}
      >
        <span>
          {seasonName(currentSeason.seasonNumber, currentSeason.title)}
        </span>
        <span className="series-season-selector__chevron" aria-hidden="true" />
      </button>
      <ul
        id={selectorId}
        className="series-season-selector__options"
        data-open={open}
        aria-hidden={!open}
        inert={!open}
      >
        {availableSeasons.map((season) => (
          <li key={season.id}>
            {season.seasonNumber === currentSeason.seasonNumber ? (
              <span aria-current="page">
                {seasonName(season.seasonNumber, season.title)}
              </span>
            ) : (
              <Link
                className="text-link"
                to={seriesPath(seriesId, season.seasonNumber)}
                state={{ series }}
              >
                {seasonName(season.seasonNumber, season.title)}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
