import type { ReactNode } from 'react';
import useDetailPage from './hooks';
import './details.scss';
import './media/media.scss';

export default function DetailsPageLayout({
  title,
  hero,
  navigation,
  children,
}: {
  title: string;
  hero: ReactNode;
  navigation?: ReactNode;
  children?: ReactNode;
}) {
  const mainRef = useDetailPage(title);

  return (
    <div className="detail-page">
      <main ref={mainRef} tabIndex={-1} aria-label={title}>
        <div
          className="header page-hero header--movie-details detail-page__hero"
          data-testid="details-component"
        >
          <div className="movie-details container">
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
}: {
  image: ReactNode;
  title: string;
  rating?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="movie-details__container">
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
