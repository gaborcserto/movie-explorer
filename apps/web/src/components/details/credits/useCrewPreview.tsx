import { useId, useRef, useState } from 'react';

import { i18n } from '../../../i18n';

const CREW_BATCH_SIZE = 12;

// Count people before grouping: one person can have several departments/jobs.
export default function useCrewPreview<T>(
  people: T[],
  resetKey: number,
  showAll = false
) {
  const [limit, setLimit] = useState(CREW_BATCH_SIZE);
  const [entity, setEntity] = useState(resetKey);
  const groupId = useId();
  const countRef = useRef<HTMLParagraphElement>(null);

  const visibleLimit = showAll ? people.length : limit;
  const visible = people.slice(0, visibleLimit);

  if (entity !== resetKey) {
    setEntity(resetKey);
    setLimit(CREW_BATCH_SIZE);
  }

  const hasMore = visible.length < people.length;

  return {
    visible,
    summary: (
      <p ref={countRef} role="status" tabIndex={-1} className="cast-count">
        {i18n.t('messages.shownCount', {
          shown: visible.length,
          count: people.length,
          kind: i18n.t('ui.crew_members'),
        })}
      </p>
    ),
    controls: (
      <div className="credit-preview-controls">
        {!showAll && hasMore && (
          <button
            type="button"
            className="btn btn--outline btn--action btn--mobile-full"
            aria-controls={groupId}
            aria-expanded={limit > CREW_BATCH_SIZE}
            onClick={() => {
              setLimit((count) => count + CREW_BATCH_SIZE);
              if (limit + CREW_BATCH_SIZE >= people.length) {
                countRef.current?.focus({ preventScroll: true });
              }
            }}
          >
            {i18n.t('ui.show_more_crew')}
          </button>
        )}
        {!showAll && limit > CREW_BATCH_SIZE && (
          <button
            type="button"
            className="btn btn--outline btn--action btn--mobile-full"
            aria-controls={groupId}
            aria-expanded
            onClick={() => {
              setLimit(CREW_BATCH_SIZE);
              countRef.current?.focus({ preventScroll: true });
            }}
          >
            {i18n.t('ui.show_less_crew')}
          </button>
        )}
      </div>
    ),
    groupId,
  };
}
