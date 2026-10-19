import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { MovieDirector } from '@movie-explorer/contracts';

import MovieImage from '../../utility/customImage';
import { getDisplaySrcSet } from '../../../util/imageSizing';

interface CastCredit extends MovieDirector {
  key: string;
  roles: string[];
}

export default function CastPreview({ members }: { members: CastCredit[] }) {
  const [visibleCount, setVisibleCount] = useState(10);
  const countRef = useRef<HTMLSpanElement>(null);
  if (members.length === 0) {
    return null;
  }

  const visible = members.slice(0, visibleCount);

  return (
    <>
      <div className="media-preview__summary">
        <span ref={countRef} role="status" tabIndex={-1} className="cast-count">
          Showing {visible.length} of {members.length} cast members
        </span>
        {visibleCount < members.length && (
          <button
            type="button"
            className="btn btn--outline btn--action media-preview__action"
            aria-label="Show more cast"
            aria-controls="movie-cast-grid"
            onClick={() => {
              setVisibleCount((count) => count + 10);

              if (visibleCount + 10 >= members.length) {
                countRef.current?.focus({ preventScroll: true });
              }
            }}
          >
            Show more
          </button>
        )}
      </div>
      <div className="cast-grid" id="movie-cast-grid">
        {visible.map((member) => {
          const characterId = `cast-character-${member.key}`;
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
    </>
  );
}
