import type { MoviePhoto, MovieVideo } from '@movie-explorer/contracts';

import PhotoLightbox from './photoLightbox';
import VideoLightbox from './videoLightbox';

export type LightboxProps =
  | {
      type: 'photo';
      photos: MoviePhoto[];
      initialIndex: number;
      title: string;
      onClose: () => void;
    }
  | {
      type: 'video';
      videos: { video: MovieVideo; videoId: string }[];
      initialIndex: number;
      title: string;
      onClose: () => void;
    };

export default function Lightbox(props: LightboxProps) {
  const { type } = props;

  if (type === 'photo') {
    const { photos, initialIndex, title, onClose } = props;

    return (
      <PhotoLightbox
        photos={photos}
        initialIndex={initialIndex}
        title={title}
        onClose={onClose}
      />
    );
  }

  const { videos, initialIndex, title, onClose } = props;

  return (
    <VideoLightbox
      videos={videos}
      initialIndex={initialIndex}
      title={title}
      onClose={onClose}
    />
  );
}
