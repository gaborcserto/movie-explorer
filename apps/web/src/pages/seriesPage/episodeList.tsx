import { Link } from 'react-router-dom';
import type {
  EpisodeSummary,
  SeasonDetails,
  SeriesDetails,
} from '@movie-explorer/contracts';

import MovieImage from '../../components/utility/customImage';
import { seriesPath } from '../../util/seriesRoutes';
import { SeriesRating } from './seriesPresentation';

export default function EpisodeList({
  seriesId,
  seasonNumber,
  episodes,
  season,
  series,
}: {
  seriesId: number;
  seasonNumber: number;
  episodes: EpisodeSummary[];
  season?: SeasonDetails;
  series?: SeriesDetails;
}) {
  return (
    <ol className="series-episodes">
      {episodes.map((episode) => (
        <li key={episode.id} value={episode.episodeNumber}>
          <Link
            className="series-episode-link"
            to={seriesPath(seriesId, seasonNumber, episode.episodeNumber)}
            state={{ season, series }}
            aria-label={`${episode.episodeNumber}. ${episode.title}`}
          >
            <MovieImage
              src={episode.stillUrl ?? undefined}
              alt=""
              className="series-episode-still"
            />
            <div className="series-episode-content">
              <h3>
                {episode.episodeNumber}. {episode.title}
              </h3>
              {episode.rating !== null &&
                Number.isFinite(episode.rating) &&
                episode.rating > 0 &&
                episode.rating <= 10 && (
                  <div className="series-episode-rating">
                    <SeriesRating
                      rating={episode.rating}
                      votes={episode.voteCount}
                    />
                  </div>
                )}
              {(episode.airDate || episode.runtimeMinutes !== null) && (
                <div className="series-episode-metadata">
                  {episode.airDate && (
                    <span>
                      <span className="series-episode-metadata__label">
                        Air date
                      </span>
                      <time dateTime={episode.airDate}>{episode.airDate}</time>
                    </span>
                  )}
                  {episode.runtimeMinutes !== null && (
                    <span>
                      <span className="series-episode-metadata__label">
                        Runtime
                      </span>
                      <span>{episode.runtimeMinutes} min</span>
                    </span>
                  )}
                </div>
              )}
              {episode.description && (
                <p className="series-excerpt">{episode.description}</p>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ol>
  );
}
