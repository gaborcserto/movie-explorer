import { useTranslation } from 'react-i18next';
import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router';
import type { MovieDirector } from '@movie-explorer/contracts';

import { i18n } from '../../../i18n';
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
  responsiveInitialCounts,
}: {
  members: CastCredit[];
  initialVisibleCount?: number;
  batchSize?: number;
  memberLabel?: string;
  responsiveInitialCounts?: {
    tabletAndMobile: number;
    desktop: number;
    wideDesktop: number;
  };
}) {
  useTranslation();

  const gridId = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [baseVisibleCount, setBaseVisibleCount] = useState(initialVisibleCount);
  const [additionalCount, setAdditionalCount] = useState(0);
  const countRef = useRef<HTMLSpanElement>(null);

  const pluralMemberLabel =
    memberLabel === 'cast'
      ? i18n.t('ui.cast').toLowerCase()
      : i18n.t('nouns.guest', { count: 2 });

  useEffect(() => {
    if (
      !responsiveInitialCounts ||
      !scrollRef.current ||
      typeof ResizeObserver === 'undefined'
    ) {
      return undefined;
    }

    const scrollContainer = scrollRef.current;

    const updateBaseCount = (width: number) => {
      let nextCount = responsiveInitialCounts.tabletAndMobile;
      const isTabletOrMobile =
        window.matchMedia?.('(width <= 1023.98px)').matches ?? width < 850;

      if (!isTabletOrMobile && width >= 1250) {
        nextCount = responsiveInitialCounts.wideDesktop;
      } else if (!isTabletOrMobile && width >= 850) {
        nextCount = responsiveInitialCounts.desktop;
      }

      setBaseVisibleCount(nextCount);
    };

    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        updateBaseCount(entry.contentRect.width);
      }
    });

    observer.observe(scrollContainer);
    updateBaseCount(scrollContainer.getBoundingClientRect().width);

    return () => observer.disconnect();
  }, [responsiveInitialCounts]);

  if (members.length === 0) {
    return null;
  }

  const visibleCount = Math.min(
    baseVisibleCount + additionalCount,
    members.length
  );
  const visible = members.slice(0, visibleCount);

  return (
    <>
      <div className="media-preview__summary">
        <span ref={countRef} role="status" tabIndex={-1} className="cast-count">
          {i18n.t(
            memberLabel === 'cast'
              ? 'messages.shownCount'
              : 'messages.guestSummary',
            {
              shown: visible.length,
              count: members.length,
              kind: i18n.t(
                memberLabel === 'cast' ? 'nouns.cast' : 'nouns.guest',
                { count: members.length }
              ),
            }
          )}
        </span>
      </div>
      <div
        className="cast-scroll"
        ref={scrollRef}
        role="region"
        aria-label={i18n.t('messages.memberRegion', {
          members:
            memberLabel === 'cast'
              ? i18n.t('ui.cast').toLowerCase()
              : i18n.t('nouns.guest', { count: 1 }),
        })}
      >
        <div className="cast-grid" id={gridId} role="list">
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
              <article className="cast-member" key={member.key} role="listitem">
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
      </div>
      <div className="credit-preview-controls">
        {visibleCount < members.length && (
          <button
            type="button"
            className="btn btn--outline btn--action btn--mobile-full"
            aria-label={i18n.t('messages.moreMembers', {
              members: pluralMemberLabel,
            })}
            aria-controls={gridId}
            aria-expanded={visibleCount > initialVisibleCount}
            onClick={() => {
              const nextCount = Math.min(
                visibleCount + batchSize,
                members.length
              );
              setAdditionalCount(nextCount - baseVisibleCount);

              if (nextCount >= members.length) {
                countRef.current?.focus({ preventScroll: true });
              }
            }}
          >
            {i18n.t('ui.show_more')}
          </button>
        )}
        {additionalCount > 0 && (
          <button
            type="button"
            className="btn btn--outline btn--action btn--mobile-full"
            aria-label={i18n.t('messages.lessMembers', {
              members: pluralMemberLabel,
            })}
            aria-controls={gridId}
            aria-expanded
            onClick={() => {
              setAdditionalCount(0);
              countRef.current?.focus({ preventScroll: true });
            }}
          >
            {i18n.t('ui.show_less')}
          </button>
        )}
      </div>
    </>
  );
}
