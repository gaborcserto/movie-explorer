import CustomImage from '../utility/customImage';
import { Movie } from '../../types';

interface DetailsProps {
  movieData: Movie;
}
function DetailsContent({ movieData }: DetailsProps) {
  const {
    title,
    release_date,
    poster_path,
    genres,
    vote_average,
    runtime,
    overview,
  } = movieData;

  const releaseYear = release_date.substring(0, 4);
  const genresData = genres?.join(', ');

  return (
    <div className="movie-details__container">
      <CustomImage
        img_path={poster_path}
        img_title={title}
        img_style="movie-details__image"
      />
      <div className="movie-details__content">
        <div className="movie-details__title__wrapper">
          <h2 className="movie-details__title">{title}</h2>
          <div className="movie-details__rating">{vote_average}</div>
        </div>
        <div className="movie-details__genre">{genresData}</div>
        <div className="movie-details__data">
          <span className="movie-details__year">{releaseYear}</span>{' '}
          <span>{runtime} min</span>
        </div>
        <div className="movie-details__overview">{overview}</div>
      </div>
    </div>
  );
}

export default DetailsContent;
