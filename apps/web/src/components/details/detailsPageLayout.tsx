import type { ReactNode } from 'react';
import useDetailPage from '../../hooks/useDetailPage';
import './details.scss';
import './media/media.scss';

export default function DetailsPageLayout({
  title,
  hero,
  navigation,
  children,
  className,
  heroClassName,
  heroContainerClassName,
}: {
  title: string;
  hero: ReactNode;
  navigation?: ReactNode;
  children?: ReactNode;
  className?: string;
  heroClassName?: string;
  heroContainerClassName?: string;
}) {
  const mainRef = useDetailPage(title);

  return (
    <div className={className ?? 'detail-page'}>
      <main ref={mainRef} tabIndex={-1} aria-label={title}>
        <div
          className={`header page-hero header--movie-details detail-page__hero${heroClassName ? ` ${heroClassName}` : ''}`}
          data-testid="details-component"
        >
          <div
            className={`movie-details container${heroContainerClassName ? ` ${heroContainerClassName}` : ''}`}
          >
            {navigation}
            {hero}
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}

export function DetailsLowerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="movie-details__lower">
      <div className="container movie-details__lower-content">{children}</div>
    </div>
  );
}

export function DetailsHeroFrame({
  image,
  title,
  rating,
  children,
  className,
}: {
  image: ReactNode;
  title: string;
  rating?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`movie-details__container${className ? ` ${className}` : ''}`}
    >
      {image}
      <div className="movie-details__content">
        <div className="movie-details__title__wrapper">
          <h1 className="movie-details__title">{title}</h1>
          {rating}
        </div>
        {children}
      </div>
    </div>
  );
}
