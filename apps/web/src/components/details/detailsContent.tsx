import type { MovieDetails } from '@movie-explorer/contracts';
import CustomImage from '../utility/customImage';

interface DetailsProps {
  movieData: MovieDetails;
}
function DetailsContent({ movieData }: DetailsProps) {
  const {
    title,
    releaseDate,
    posterUrl,
    genres,
    rating,
    runtimeMinutes,
    description,
  } = movieData;

  const releaseYear = releaseDate.substring(0, 4);
  const genresData = genres?.join(', ');

  return (
    <div className="movie-details__container">
      <CustomImage
        img_path={posterUrl}
        img_title={title}
        img_style="movie-details__image"
      />
      <div className="movie-details__content">
        <div className="movie-details__title__wrapper">
          <h2 className="movie-details__title">{title}</h2>
          <div className="movie-details__rating">{rating}</div>
        </div>
        <div className="movie-details__genre">{genresData}</div>
        <div className="movie-details__data">
          <span className="movie-details__year">{releaseYear}</span>{' '}
          <span>{runtimeMinutes} min</span>
        </div>
        <div className="movie-details__overview">{description}</div>
      </div>
    </div>
  );
}

export default DetailsContent;
