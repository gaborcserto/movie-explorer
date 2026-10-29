import Skeleton, { SkeletonRegion } from './skeleton';

export interface CardSkeletonsProps {
  count?: number;
}

export interface ResultsSkeletonProps {
  className?: string;
  label?: string;
}

export interface SectionSkeletonProps {
  label: string;
  portraits?: boolean;
}

export interface DetailHeroSkeletonProps {
  label?: string;
}

export function CardSkeletons({ count = 10 }: CardSkeletonsProps) {
  return Array.from({ length: count }, (_, index) => (
    <div className="card skeleton-card" aria-hidden="true" key={index}>
      <Skeleton className="skeleton-card__poster" radius={4} />
      <div className="skeleton-card__caption">
        <Skeleton width="75%" height={22} />
        <Skeleton width="45%" height={17} />
      </div>
    </div>
  ));
}

export function ResultsSkeleton({
  className = 'list__container container',
  label = 'Loading results',
}: ResultsSkeletonProps) {
  return (
    <SkeletonRegion className={className} label={label}>
      <div className="list__summary">
        <Skeleton width={140} height={20} />
      </div>
      <div className="list__items">
        <CardSkeletons />
      </div>
    </SkeletonRegion>
  );
}

export function SectionSkeleton({
  label,
  portraits = false,
}: SectionSkeletonProps) {
  return (
    <SkeletonRegion label={`Loading ${label}`} className="section-skeleton">
      <Skeleton width={150} height={24} />
      <div className="section-skeleton__items">
        {Array.from({ length: portraits ? 6 : 3 }, (_, index) => (
          <div key={index}>
            <Skeleton
              className={
                portraits
                  ? 'section-skeleton__portrait'
                  : 'section-skeleton__media'
              }
              circle={portraits}
            />
            <Skeleton width="75%" height={18} />
          </div>
        ))}
      </div>
    </SkeletonRegion>
  );
}

export function DetailHeroSkeleton({
  label = 'Loading details',
}: DetailHeroSkeletonProps) {
  return (
    <SkeletonRegion label={label}>
      <div className="movie-details__container">
        <Skeleton className="movie-details__image" radius={10} />
        <div className="movie-details__content">
          <div className="movie-details__title__wrapper">
            <Skeleton width="85%" className="detail-skeleton__title" />
            <Skeleton width={140} height={50} radius={10} />
          </div>
          <div className="movie-details__genre">
            <Skeleton width="70%" height={17} />
          </div>
          <div className="movie-details__data">
            <Skeleton width="50%" height={29} />
          </div>
          <div className="movie-details__section movie-details__information">
            <div className="movie-details__section-title">
              <Skeleton width={150} height={20} />
            </div>
            <div className="movie-details__metadata">
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} height={39} />
              ))}
            </div>
          </div>
          <div className="details-section watch-providers detail-skeleton__providers">
            <Skeleton width={150} height={24} />
            <div className="watch-providers__groups">
              <Skeleton width={42} height={42} radius={8} />
              <Skeleton width={42} height={42} radius={8} />
            </div>
          </div>
          <div className="movie-details__section">
            <div className="movie-details__section-title">
              <Skeleton width={100} height={20} />
            </div>
            <div className="detail-skeleton__overview">
              {Array.from({ length: 7 }, (_, index) => (
                <Skeleton key={index} width={index === 6 ? '65%' : '100%'} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </SkeletonRegion>
  );
}

export function DetailSectionsSkeleton() {
  return (
    <div aria-hidden="true">
      <SectionSkeleton label="cast and crew" portraits />
      <SectionSkeleton label="media" />
    </div>
  );
}
