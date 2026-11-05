import type { MoviePhoto, Ratings } from '@movie-explorer/contracts';

import DetailsRatings from '../../../components/details/ratings';
import HeroImage from '../../../components/heroImage';
import { DetailsHeroFrame } from '../../../components/details/detailsPageLayout';
import SeriesRating from '../seriesRating';

export default function SeriesHero({
  title,
  image,
  srcSet,
  still = false,
  imageSizes,
  seriesId,
  rating,
  votes,
  ratingsValue,
  ratingsLoading,
  showVoteCount = true,
  photos,
  className,
  children,
}: {
  title: string;
  image: string | null;
  srcSet?: string;
  still?: boolean;
  imageSizes?: string;
  seriesId?: number;
  rating?: number | null;
  votes?: number | null;
  ratingsValue?: Ratings;
  ratingsLoading?: boolean;
  showVoteCount?: boolean;
  photos?: MoviePhoto[];
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <DetailsHeroFrame
      title={title}
      className={className}
      rating={
        seriesId === undefined ? (
          <SeriesRating rating={rating ?? null} votes={votes ?? null} />
        ) : (
          <DetailsRatings
            tmdb={rating}
            votes={votes}
            value={ratingsValue}
            loading={ratingsLoading}
          />
        )
      }
      image={
        <HeroImage
          key={seriesId}
          src={image ?? undefined}
          srcSet={srcSet}
          fullSrcSet={srcSet}
          photos={photos}
          actionLabel={
            seriesId !== undefined
              ? `Open poster gallery for ${title}`
              : undefined
          }
          sizes={
            imageSizes ??
            (still
              ? '(max-width: 767.98px) min(500px, calc(100vw - 52px)), (max-width: 991.98px) 260px, 320px'
              : '(max-width: 767.98px) min(320px, calc(100vw - 52px)), (max-width: 991.98px) 260px, 320px')
          }
          alt={still ? `Still from ${title}` : `Poster for ${title}`}
          title={title}
          className={`movie-details__image${still ? ' movie-details__image--still' : ''}`}
        />
      }
    >
      {showVoteCount && votes !== null && votes !== undefined && (
        <p className="series-rating">{votes.toLocaleString()} votes</p>
      )}
      {children}
    </DetailsHeroFrame>
  );
}
