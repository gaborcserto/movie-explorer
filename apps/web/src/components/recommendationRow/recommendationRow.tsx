import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { MovieCollectionResponse } from '@movie-explorer/contracts';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa6';

import SearchResultCard from '../list/searchResultCard';
import { CardSkeletons } from '../skeleton';
import presentApiError from '../../util/errorPresentation';
import useRecommendationResource from './useRecommendationResource';
import type { RecommendationSource } from './useRecommendationResource';
import '../../pages/homePage/discover.scss';
import '../list/list.scss';
import './recommendationRow.scss';

interface Props {
  title: string;
  source: RecommendationSource;
  home?: boolean;
  allowMissingPosters?: boolean;
  excludedMovieIds?: number[];
  onCollectionLoaded?: (data: MovieCollectionResponse) => void;
}

function RecommendationRowContent({
  title,
  source,
  home,
  allowMissingPosters,
  excludedMovieIds,
  onCollectionLoaded,
}: Props) {
  const headingId = useId();
  const { containerRef, data, error, pending, retry, delay } =
    useRecommendationResource(source);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  const isCollection = source.kind === 'collection';
  const collection = data && 'collection' in data ? data.collection : undefined;
  const seen = new Set<string>();
  const results =
    data?.results.filter((item) => {
      const key = `${item.mediaType}:${item.id}`;

      if (
        (!isCollection && !allowMissingPosters && !item.posterUrl?.trim()) ||
        item.id === source.id ||
        (item.mediaType === 'movie' && excludedMovieIds?.includes(item.id)) ||
        seen.has(key) ||
        source.preferences?.excludedIds.includes(item.id)
      ) {
        return false;
      }
      seen.add(key);

      return true;
    }) ?? [];

  useEffect(() => {
    if (data && 'collection' in data) {
      onCollectionLoaded?.(data);
    }
  }, [data, onCollectionLoaded]);

  const measure = () => {
    const viewport = viewportRef.current;

    if (viewport) {
      const next = {
        start: viewport.scrollLeft <= 1,
        end:
          viewport.scrollLeft + viewport.clientWidth >=
          viewport.scrollWidth - 1,
      };
      setEdges((previous) =>
        previous.start === next.start && previous.end === next.end
          ? previous
          : next
      );
    }
  };

  useLayoutEffect(() => {
    measure();
    const viewport = viewportRef.current;
    const observer =
      typeof ResizeObserver === 'undefined'
        ? undefined
        : new ResizeObserver(measure);

    if (viewport) {
      observer?.observe(viewport);
    }

    window.addEventListener('resize', measure);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [data, excludedMovieIds]);

  const scroll = (direction: number) => {
    const viewport = viewportRef.current;

    if (viewport) {
      const styles = window.getComputedStyle(viewport);
      const track = viewport.querySelector('.list__items');
      const gap = track
        ? parseFloat(window.getComputedStyle(track).columnGap) || 0
        : 0;
      const contentWidth =
        viewport.clientWidth -
        (parseFloat(styles.paddingLeft) || 0) -
        (parseFloat(styles.paddingRight) || 0);

      viewport.scrollBy({
        left: (contentWidth + gap) * direction,
        behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)')
          .matches
          ? 'auto'
          : 'smooth',
      });
    }
  };

  const handleRetry = () => {
    if (pending || delay) {
      return;
    }

    containerRef.current?.focus({ preventScroll: true });
    retry();
  };
  const partial = data?.availability === 'partial';
  const feedback = error ? presentApiError(error)?.description : undefined;

  if (isCollection && data && !results.length) {
    return null;
  }

  const controls = results.length > 0 && (
    <div className="recommendation-row__controls">
      <button
        type="button"
        className="lightbox-control"
        aria-label={`Previous ${title}`}
        aria-controls={`${headingId}-cards`}
        disabled={edges.start}
        onClick={() => scroll(-1)}
      >
        <FaChevronLeft aria-hidden="true" />
      </button>
      <button
        type="button"
        className="lightbox-control"
        aria-label={`Next ${title}`}
        aria-controls={`${headingId}-cards`}
        disabled={edges.end}
        onClick={() => scroll(1)}
      >
        <FaChevronRight aria-hidden="true" />
      </button>
    </div>
  );

  return (
    <section
      ref={containerRef}
      className={`recommendation-row discover-row ${home ? 'recommendation-row--home' : 'details-section'}`}
      aria-labelledby={headingId}
      aria-busy={pending}
      tabIndex={-1}
    >
      {home ? (
        <h4 id={headingId} className="visually-hidden">
          {title}
        </h4>
      ) : (
        <div className="details-section__heading">
          <h2 id={headingId}>{title}</h2>
          {controls}
        </div>
      )}
      <div aria-live="polite" className="list__summary">
        {isCollection && collection?.name && (
          <p className="discover-row__message">{collection.name}</p>
        )}
        <div className={home ? 'recommendation-row__status' : undefined}>
          <p className="list__loaded" role="status">
            {pending && !data
              ? `Loading ${title.toLowerCase()}...`
              : `${results.length} titles loaded${pending ? ' - Retrying...' : ''}`}
          </p>
          {home && controls}
        </div>
        {home && data && 'source' in data && data.source !== 'popular' && (
          <p className="discover-row__message">
            Based on your Favorites
            {data.source === 'mixed' ? ', with Popular titles' : ''}.
          </p>
        )}
        {partial && (
          <p className="discover-row__message">
            {isCollection
              ? 'Some collection movies are unavailable.'
              : 'Some recommendations are unavailable.'}
          </p>
        )}
        {feedback && (
          <p className="discover-row__message" role="status">
            {feedback}
          </p>
        )}
        {!isCollection && !pending && data && !results.length && (
          <p className="discover-row__message" role="status">
            {data.results.length
              ? 'No recommendations with posters are available right now.'
              : 'No recommendations are available right now.'}
          </p>
        )}
        {(error || partial) && (
          <button
            type="button"
            className="btn btn--outline btn--action"
            aria-disabled={pending || delay > 0}
            onClick={handleRetry}
          >
            {delay > 0 ? `Retry in ${delay}s` : 'Try again'}
          </button>
        )}
      </div>
      {(results.length > 0 || (pending && !data)) && (
        <div
          ref={viewportRef}
          className="recommendation-row__viewport"
          id={`${headingId}-cards`}
          role="region"
          aria-label={`Scroll ${title} cards`}
          onScroll={measure}
        >
          <div className="list__items">
            {pending && !data ? (
              <CardSkeletons count={5} />
            ) : (
              results.map((item) => (
                <div
                  key={`${item.mediaType}:${item.id}`}
                  className="discover-row__card"
                >
                  <SearchResultCard item={item} showMediaType />
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default function RecommendationRow(props: Props) {
  const { source } = props;
  const key = source.category
    ? `${source.category}:${source.libraryKey ?? ''}`
    : `${source.resource}:${source.id}:${source.kind}`;

  return <RecommendationRowContent key={key} {...props} />;
}
