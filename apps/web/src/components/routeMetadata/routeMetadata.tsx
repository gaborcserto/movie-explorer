import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type {
  MovieDetails,
  PersonDetails,
  SeriesDetails,
} from '@movie-explorer/contracts';

import {
  applyMetadata,
  publicImage,
  siteDescription,
  siteOrigin,
  siteTitle,
} from '../../seo/metadata';

function configuredOrigin() {
  return siteOrigin(import.meta.env.VITE_SITE_URL);
}

export default function RouteMetadata() {
  const { pathname, search } = useLocation();

  // Run after prior detail-title cleanups and before metadata in the route subtree.
  useEffect(() => {
    const origin = configuredOrigin();
    const home = pathname === '/' && !search;
    const params = new URLSearchParams(search);
    let title = 'Page not found';

    if (pathname === '/') {
      title = params.get('view') === 'tv' ? 'Series' : 'Movies';

      if (home) {
        title = siteTitle;
      }
    } else if (pathname.startsWith('/search')) {
      title = 'Search results';
    } else if (pathname === '/library') {
      title = 'Library';
    } else if (/^\/(movie|series|person)\//.test(pathname)) {
      title = 'Details';
    }

    applyMetadata({
      title,
      index: Boolean(origin && home),
      canonical: origin && home ? `${origin}/` : undefined,
      image: import.meta.env.VITE_SOCIAL_IMAGE_URL,
      schema:
        origin && home
          ? {
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: siteTitle,
              description: siteDescription,
              url: `${origin}/`,
            }
          : undefined,
    });

    return () => applyMetadata({ title: siteTitle });
  }, [pathname, search]);

  return null;
}

type EntityProps =
  | { kind: 'movie'; data: MovieDetails }
  | { kind: 'series'; data: SeriesDetails }
  | { kind: 'person'; data: PersonDetails };

export function EntityMetadata({ kind, data }: EntityProps) {
  const { search } = useLocation();

  useEffect(() => {
    const origin = configuredOrigin();
    const title = 'title' in data ? data.title : data.name;
    const description = 'title' in data ? data.description : data.biography;
    const image = publicImage(
      'title' in data ? data.posterUrl : data.profileUrl
    );
    const canonical = origin ? `${origin}/${kind}/${data.id}` : undefined;
    const schemaType = { movie: 'Movie', series: 'TVSeries', person: 'Person' }[
      kind
    ];

    applyMetadata({
      title,
      description,
      canonical,
      index: Boolean(origin && !search),
      image,
      type: {
        movie: 'video.movie',
        series: 'video.tv_show',
        person: 'profile',
      }[kind],
      schema: canonical
        ? {
            '@context': 'https://schema.org',
            '@type': schemaType,
            name: title,
            url: canonical,
            ...(description?.trim() && { description }),
            ...(image && { image }),
          }
        : undefined,
    });

    return () => applyMetadata({ title: siteTitle });
  }, [kind, data, search]);

  return null;
}
