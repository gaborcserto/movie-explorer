import { useEffect } from 'react';

import { Skeleton, SkeletonRegion } from '../../components/skeleton';

interface LoadingProps {
  className: string;
  title?: string;
}
function Loading({ className, title }: LoadingProps) {
  useEffect(() => {
    if (!title) {
      return undefined;
    }

    const previousTitle = document.title;
    document.title = `${title} | Movie Explorer`;

    return () => {
      document.title = previousTitle;
    };
  }, [title]);

  return (
    <main className={className} tabIndex={-1}>
      <div className="header page-hero header--movie-details detail-page__hero">
        <div className="movie-details container">
          <SkeletonRegion
            className="movie-details__container movie-details__container--loading"
            label={title ?? 'Loading content'}
          >
            <div className="skeleton-copy">
              <Skeleton height={32} width="60%" />
              <Skeleton height={20} />
              <Skeleton height={20} width="80%" />
            </div>
          </SkeletonRegion>
        </div>
      </div>
    </main>
  );
}

export default Loading;
