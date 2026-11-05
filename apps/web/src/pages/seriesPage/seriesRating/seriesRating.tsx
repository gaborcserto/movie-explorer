import { RatingsDisplay } from '../../../components/details/ratings';

export default function SeriesRating({
  rating,
  votes,
}: {
  rating: number | null;
  votes: number | null;
}) {
  if (
    rating === null ||
    !Number.isFinite(rating) ||
    rating <= 0 ||
    rating > 10
  ) {
    return null;
  }

  const voteCount =
    votes !== null && Number.isFinite(votes) && votes > 0 ? votes : null;

  return <RatingsDisplay tmdb={rating} votes={voteCount} />;
}
