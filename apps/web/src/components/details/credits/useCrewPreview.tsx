import { useEffect, useId, useRef, useState } from 'react';

const CREW_BATCH_SIZE = 12;

// Count people before grouping: one person can have several departments/jobs.
export default function useCrewPreview<T>(
  people: T[],
  resetKey: number,
  showAll = false
) {
  const [limit, setLimit] = useState(CREW_BATCH_SIZE);
  const groupId = useId();
  const countRef = useRef<HTMLParagraphElement>(null);
  const visibleLimit = showAll ? people.length : limit;
  const visible = people.slice(0, visibleLimit);
  useEffect(() => setLimit(CREW_BATCH_SIZE), [resetKey]);
  const hasMore = visible.length < people.length;

  return {
    visible,
    summary: (
      <p ref={countRef} role="status" tabIndex={-1} className="cast-count">
        Showing {visible.length} of {people.length} crew members
      </p>
    ),
    controls: (
      <div className="credit-preview-controls">
        {!showAll && hasMore && (
          <button
            type="button"
            className="btn btn--outline btn--action"
            aria-controls={groupId}
            aria-expanded={limit > CREW_BATCH_SIZE}
            onClick={() => {
              setLimit((count) => count + CREW_BATCH_SIZE);
              if (limit + CREW_BATCH_SIZE >= people.length) {
                countRef.current?.focus({ preventScroll: true });
              }
            }}
          >
            Show more crew
          </button>
        )}
        {!showAll && limit > CREW_BATCH_SIZE && (
          <button
            type="button"
            className="btn btn--outline btn--action"
            aria-controls={groupId}
            aria-expanded
            onClick={() => {
              setLimit(CREW_BATCH_SIZE);
              countRef.current?.focus({ preventScroll: true });
            }}
          >
            Show less crew
          </button>
        )}
      </div>
    ),
    groupId,
  };
}
