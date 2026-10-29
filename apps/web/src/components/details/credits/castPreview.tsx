import { useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { MovieDirector } from '@movie-explorer/contracts';

import MovieImage from '../../utility/customImage';
import { getDisplaySrcSet } from '../../../util/imageSizing';

interface CastCredit extends MovieDirector {
  key: string;
  roles: string[];
}

export default function CastPreview({
  members,
  initialVisibleCount = 10,
  batchSize = 10,
  memberLabel = 'cast',
}: {
  members: CastCredit[];
  initialVisibleCount?: number;
  batchSize?: number;
  memberLabel?: string;
}) {
  const gridId = useId();
  const [visibleCount, setVisibleCount] = useState(initialVisibleCount);
  const countRef = useRef<HTMLSpanElement>(null);
  const pluralMemberLabel = memberLabel === 'cast' ? 'cast' : `${memberLabel}s`;

  if (members.length === 0) {
    return null;
  }

  const visible = members.slice(0, visibleCount);

  return (
    <>
      <div className="media-preview__summary">
        <span ref={countRef} role="status" tabIndex={-1} className="cast-count">
          Showing {visible.length} of {members.length}{' '}
          {memberLabel === 'cast' ? 'cast members' : `${memberLabel}s`}
        </span>
      </div>
      <div className="cast-grid" id={gridId}>
        {visible.map((member) => {
          const characterId = `${gridId}-character-${member.key}`;
          const content = (
            <>
              <MovieImage
                src={member.profileUrl}
                srcSet={getDisplaySrcSet(member.profileSrcSet)}
                alt={member.name}
                className="cast-member__image"
              />
              <div>
                <h3>{member.name}</h3>
                {member.roles.length > 0 && (
                  <p id={characterId}>{member.roles.join(' · ')}</p>
                )}
              </div>
            </>
          );

          return (
            <article className="cast-member" key={member.key}>
              {member.id !== undefined &&
              Number.isSafeInteger(member.id) &&
              member.id > 0 ? (
                <Link
                  to={`/person/${member.id}`}
                  className="cast-member__link"
                  aria-label={member.name}
                  aria-describedby={
                    member.roles.length > 0 ? characterId : undefined
                  }
                >
                  {content}
                </Link>
              ) : (
                content
              )}
            </article>
          );
        })}
      </div>
      <div className="credit-preview-controls">
        {visibleCount < members.length && (
          <button
            type="button"
            className="btn btn--outline btn--action"
            aria-label={`Show more ${pluralMemberLabel}`}
            aria-controls={gridId}
            aria-expanded={visibleCount > initialVisibleCount}
            onClick={() => {
              const nextCount = Math.min(
                visibleCount + batchSize,
                members.length
              );
              setVisibleCount(nextCount);

              if (nextCount >= members.length) {
                countRef.current?.focus({ preventScroll: true });
              }
            }}
          >
            Show more
          </button>
        )}
        {visibleCount > initialVisibleCount && (
          <button
            type="button"
            className="btn btn--outline btn--action"
            aria-label={`Show less ${pluralMemberLabel}`}
            aria-controls={gridId}
            aria-expanded
            onClick={() => {
              setVisibleCount(initialVisibleCount);
              countRef.current?.focus({ preventScroll: true });
            }}
          >
            Show less
          </button>
        )}
      </div>
    </>
  );
}
