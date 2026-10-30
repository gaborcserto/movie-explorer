import { CardSkeletons } from '../../components/skeleton';
import useStablePanelHeight from '../../hooks/useStablePanelHeight';
import SearchResultCard from '../../components/list/searchResultCard';
import type { DiscoverSectionData } from './useDiscoverSection';
import './discover.scss';
import '../../components/list/list.scss';

interface DiscoverRowProps {
  title: string;
  id: string;
  tabId: string;
  data: DiscoverSectionData;
}

export default function DiscoverRow({
  title,
  id,
  tabId,
  data: { state, retry, loadMore },
}: DiscoverRowProps) {
  const panelRef = useStablePanelHeight<HTMLElement>(tabId);
  const hasMore =
    state.status === 'success' &&
    (state.visibleCount < state.results.length ||
      state.page < state.totalPages);

  return (
    <section
      ref={panelRef}
      className="discover-row tab-panel-stable"
      id={`${id}-panel`}
      role="tabpanel"
      aria-labelledby={tabId}
      aria-busy={
        state.status === 'loading' ||
        (state.status === 'success' && state.loadingMore)
      }
      tabIndex={0}
    >
      <div className="list__summary discover-row__summary" aria-live="polite">
        {state.status === 'success' && state.results.length > 0 && (
          <p className="list__loaded">
            {Math.min(state.visibleCount, state.results.length)} titles loaded
          </p>
        )}
      </div>
      <div
        className="discover-row__viewport"
        role="group"
        aria-label={`Scroll ${title} cards`}
      >
        {state.status === 'loading' && (
          <div className="list__items" aria-label={`Loading ${title}`}>
            <CardSkeletons count={5} />
          </div>
        )}
        {state.status === 'error' && (
          <div className="list__container--error" role="status">
            <p>This collection could not load.</p>
            <button
              type="button"
              className="btn btn--outline btn--action"
              onClick={retry}
            >
              Try again
            </button>
          </div>
        )}
        {state.status === 'success' && state.results.length === 0 && (
          <p className="discover-row__message" role="status">
            No titles are available right now.
          </p>
        )}
        {state.status === 'success' && state.results.length > 0 && (
          <div className="list__items" role="region" aria-label={title}>
            {state.results.slice(0, state.visibleCount).map((item) => (
              <div
                key={`${item.mediaType}:${item.id}`}
                className="discover-row__card"
              >
                <SearchResultCard item={item} showMediaType />
              </div>
            ))}
            {state.loadingMore && <CardSkeletons count={5} />}
          </div>
        )}
      </div>
      {state.status === 'success' && state.loadMoreError && (
        <div className="list__more-error" role="alert">
          <span>More titles could not load.</span>
          <button
            type="button"
            className="btn btn--outline"
            disabled={state.loadingMore}
            onClick={retry}
          >
            Try again
          </button>
        </div>
      )}
      {(state.status !== 'success' || !state.loadMoreError) && (
        <div className="list__more discover-row__more">
          {hasMore && state.status === 'success' && (
            <button
              type="button"
              className="btn btn--outline btn--action"
              disabled={state.loadingMore}
              onClick={loadMore}
            >
              {state.loadingMore ? 'Loading more…' : 'Load more'}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
