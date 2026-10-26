import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import HeaderSearch from '../search/headerSearch';
import Footer from '../../layouts/footer';
import useDetailPage from './hooks';
import './details.scss';
import './media/media.scss';

export default function DetailsPageLayout({
  title,
  hero,
  navigation,
  backdrop,
  children,
}: {
  title: string;
  hero: ReactNode;
  navigation?: ReactNode;
  backdrop?: string | null;
  children?: ReactNode;
}) {
  const mainRef = useDetailPage(title);

  return (
    <>
      <div className="detail-page">
        <header className="detail-page__navigation movie-details container">
          <div className="movie-details__top detail-header">
            <Link to="/search" className="movie-details__brand brand">
              <strong>Movie</strong> Explorer
            </Link>
            <HeaderSearch />
          </div>
        </header>
        <main ref={mainRef} tabIndex={-1} aria-label={title}>
          <div
            className="header header--movie-details detail-page__hero"
            data-testid="details-component"
          >
            {backdrop && (
              <img
                className="detail-page__backdrop"
                src={backdrop}
                alt=""
                decoding="async"
              />
            )}
            <div className="movie-details container">
              {navigation}
              {hero}
            </div>
          </div>
          {children}
        </main>
      </div>
      <Footer />
    </>
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
