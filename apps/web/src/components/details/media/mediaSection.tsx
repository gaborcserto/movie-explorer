import type { ReactNode } from 'react';
import type {
  MediaPhoto,
  MediaVideo,
  SectionAvailability,
} from '@movie-explorer/contracts';

import PhotoPreview from './photoPreview';
import VideoPreview from './videoPreview';

interface Props {
  title: string;
  resetKey: number;
  backdrops: MediaPhoto[];
  posters: MediaPhoto[];
  videos: MediaVideo[];
  availability?: {
    backdrops?: SectionAvailability;
    posters?: SectionAvailability;
    videos?: SectionAvailability;
  };
  backdropsRecovery?: ReactNode;
  postersRecovery?: ReactNode;
  videosRecovery?: ReactNode;
  imagesRecovery?: ReactNode;
}

export default function MediaSection({
  title,
  resetKey,
  backdrops,
  posters,
  videos,
  availability,
  backdropsRecovery,
  postersRecovery,
  videosRecovery,
  imagesRecovery,
}: Props) {
  const hasBackdrops = backdrops.length > 0;
  const hasPosters = posters.length > 0;
  const hasVideos = videos.length > 0;
  const hasBackdropsState = availability?.backdrops?.status === 'unavailable';
  const hasPostersState = availability?.posters?.status === 'unavailable';
  const hasVideosState = availability?.videos?.status === 'unavailable';
  const showBackdrops = hasBackdrops || hasBackdropsState;
  const showPosters = hasPosters || hasPostersState;
  const showVideos = hasVideos || hasVideosState;
  const showSection = showBackdrops || showPosters || showVideos;

  return (
    <>
      {imagesRecovery}
      {backdropsRecovery}
      {postersRecovery}
      {videosRecovery}
      {showSection && (
        <section
          className="details-section media-section"
          aria-labelledby="media-heading"
        >
          <h2 id="media-heading">Media</h2>
          {showBackdrops && (
            <div className="media-block">
              <h3>Backdrops</h3>
              {hasBackdrops && (
                <PhotoPreview
                  photos={backdrops}
                  title={title}
                  category="backdrops"
                  resetKey={resetKey}
                />
              )}
            </div>
          )}
          {showPosters && (
            <div className="media-block">
              <h3>Posters</h3>
              {hasPosters && (
                <PhotoPreview
                  photos={posters}
                  title={title}
                  portrait
                  category="posters"
                  resetKey={resetKey}
                />
              )}
            </div>
          )}
          {showVideos && (
            <div className="media-block">
              <h3>Videos &amp; Trailers</h3>
              {hasVideos && (
                <VideoPreview
                  videos={videos}
                  title={title}
                  resetKey={resetKey}
                />
              )}
            </div>
          )}
        </section>
      )}
    </>
  );
}
