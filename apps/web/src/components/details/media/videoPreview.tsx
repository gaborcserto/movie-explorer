import { useEffect, useId, useRef, useState } from 'react';
import type { MovieVideo } from '@movie-explorer/contracts';

import MovieImage from '../../utility/customImage';
import { Lightbox } from '../../lightbox';

interface Props {
  videos: MovieVideo[];
  title: string;
  resetKey: number;
}

type SupportedVideo = { video: MovieVideo; videoId: string };

function getYouTubeVideoId(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const isYouTubeHost =
      hostname === 'youtube.com' ||
      hostname.endsWith('.youtube.com') ||
      hostname === 'youtu.be';
    if (!isYouTubeHost) {
      return undefined;
    }

    const [firstSegment, secondSegment] = parsed.pathname
      .split('/')
      .filter(Boolean);

    let candidate: string | null | undefined;
    if (hostname === 'youtu.be') {
      candidate = firstSegment;
    } else if (parsed.pathname === '/watch') {
      candidate = parsed.searchParams.get('v');
    } else if (['embed', 'shorts', 'live'].includes(firstSegment ?? '')) {
      candidate = secondSegment;
    }

    return candidate && /^[\w-]{11}$/.test(candidate) ? candidate : undefined;
  } catch {
    return undefined;
  }
}

function isSupportedVideo(entry: {
  video: MovieVideo;
  videoId: string | undefined;
}): entry is SupportedVideo {
  return entry.videoId !== undefined;
}

export default function VideoPreview({ videos, title, resetKey }: Props) {
  const gridId = useId();
  const [visibleVideoCount, setVisibleVideoCount] = useState(4);
  const [selectedVideo, setSelectedVideo] = useState<number | null>(null);
  const lastVideoRef = useRef<HTMLElement>(null);
  const focusLastVideo = useRef(false);
  const rememberLastVideo = (element: HTMLElement | null) => {
    lastVideoRef.current = element;
  };

  useEffect(() => {
    setVisibleVideoCount(4);
    setSelectedVideo(null);
    focusLastVideo.current = false;
  }, [resetKey]);

  useEffect(() => {
    if (!focusLastVideo.current) {
      return;
    }

    focusLastVideo.current = false;
    lastVideoRef.current?.focus({ preventScroll: true });
  }, [visibleVideoCount]);

  const videoEntries = videos.map((video) => ({
    video,
    videoId: getYouTubeVideoId(video.url),
  }));
  const supportedVideos = videoEntries.filter(isSupportedVideo);
  const lastVisibleVideoIndex =
    Math.min(visibleVideoCount, videoEntries.length) - 1;

  return (
    <>
      <div className="media-preview__summary">
        <span>
          {videos.length} {videos.length === 1 ? 'video' : 'videos'} available
        </span>
        {visibleVideoCount < videos.length && (
          <button
            type="button"
            className="btn btn--outline btn--action media-preview__action"
            aria-controls={gridId}
            aria-label="Show more videos"
            onClick={() => {
              focusLastVideo.current = visibleVideoCount + 4 >= videos.length;
              setVisibleVideoCount((count) => count + 4);
            }}
          >
            Show more
          </button>
        )}
      </div>
      <div className="video-grid" id={gridId}>
        {videoEntries.slice(0, visibleVideoCount).map((entry) => {
          const { video, videoId } = entry;
          const label = video.name || 'Video';
          const playerIndex = videoId
            ? supportedVideos.findIndex(
                (supportedVideo) => supportedVideo === entry
              )
            : -1;
          const content = (
            <>
              <MovieImage
                src={video.thumbnailUrl}
                alt=""
                className="media-thumbnail"
              />
              <span>{label}</span>
            </>
          );

          if (playerIndex >= 0) {
            return (
              <button
                type="button"
                className="video-tile"
                aria-label={`Play ${label}`}
                key={`${video.url}-${video.name}`}
                ref={
                  entry === videoEntries[lastVisibleVideoIndex]
                    ? rememberLastVideo
                    : undefined
                }
                onClick={() => setSelectedVideo(playerIndex)}
              >
                {content}
              </button>
            );
          }
          if (video.url) {
            return (
              <a
                className="video-tile"
                href={video.url}
                title={label}
                target="_blank"
                rel="noreferrer"
                key={`${video.url}-${video.name}`}
                ref={
                  entry === videoEntries[lastVisibleVideoIndex]
                    ? rememberLastVideo
                    : undefined
                }
              >
                {content}
              </a>
            );
          }
          return (
            <div
              className="video-tile"
              key={`${video.site}-${video.key}`}
              ref={
                entry === videoEntries[lastVisibleVideoIndex]
                  ? rememberLastVideo
                  : undefined
              }
              tabIndex={-1}
            >
              {content}
              <p>Playback unavailable for {video.site || 'this site'}.</p>
            </div>
          );
        })}
      </div>
      {selectedVideo !== null && (
        <Lightbox
          type="video"
          videos={supportedVideos}
          initialIndex={selectedVideo}
          title={title}
          onClose={() => setSelectedVideo(null)}
        />
      )}
    </>
  );
}
