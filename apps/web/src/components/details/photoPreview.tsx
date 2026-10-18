import { useEffect, useRef, useState } from 'react';
import type { MoviePhoto } from '@movie-explorer/contracts';
import MovieImage from '../utility/customImage';
import PhotoLightbox from './photoLightbox';
import './media.scss';

interface Props {
  photos: MoviePhoto[];
  title: string;
  portrait?: boolean;
  category?: 'backdrops' | 'posters';
  resetKey?: number;
}

const PHOTO_BATCH_SIZES = {
  backdrops: 6,
  posters: 10,
  photos: 10,
} as const;

export default function PhotoPreview({
  photos,
  title,
  portrait,
  category,
  resetKey,
}: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const lastPhotoRef = useRef<HTMLButtonElement>(null);
  const focusLastPhoto = useRef(false);
  const seen = new Set<string>();
  const available = photos.filter((photo) => {
    if (!photo.fullUrl?.trim() || seen.has(photo.fullUrl)) return false;
    seen.add(photo.fullUrl);
    return true;
  });
  const plural = category ?? 'photos';
  const singular = plural.slice(0, -1);
  const batchSize = PHOTO_BATCH_SIZES[plural];
  const [visibleCount, setVisibleCount] = useState<number>(batchSize);
  const visiblePhotos = available.slice(0, visibleCount);
  useEffect(() => {
    setVisibleCount(batchSize);
    setSelected(null);
    focusLastPhoto.current = false;
  }, [batchSize, resetKey]);
  useEffect(() => {
    if (!focusLastPhoto.current) return;
    focusLastPhoto.current = false;
    lastPhotoRef.current?.focus({ preventScroll: true });
  }, [visibleCount]);
  return (
    <>
      <div className="media-preview__summary">
        <span>
          {available.length} {available.length === 1 ? singular : plural}{' '}
          available
        </span>
        {visibleCount < available.length && (
          <button
            type="button"
            className="btn btn--outline btn--action media-preview__action"
            aria-label={`Show more ${plural} for ${title}`}
            onClick={() => {
              focusLastPhoto.current =
                visibleCount + batchSize >= available.length;
              setVisibleCount((count) => count + batchSize);
            }}
          >
            Show more
          </button>
        )}
      </div>
      <div
        className={`photo-grid${portrait ? ' photo-grid--portraits' : ''}${category === 'posters' ? ' photo-grid--posters' : ''}`}
      >
        {visiblePhotos.map((photo, index) => (
          <button
            type="button"
            className="photo-tile"
            key={photo.fullUrl}
            ref={index === visiblePhotos.length - 1 ? lastPhotoRef : undefined}
            aria-label={`View ${title} ${category ? category.slice(0, -1) : 'photo'} ${index + 1}`}
            aria-haspopup="dialog"
            onClick={() => setSelected(index)}
          >
            <MovieImage
              src={photo.thumbnailUrl}
              alt={
                photo.alt ??
                `${title} ${category ? category.slice(0, -1) : 'still'} ${index + 1}`
              }
              className="media-thumbnail"
            />
          </button>
        ))}
      </div>
      {selected !== null && (
        <PhotoLightbox
          photos={available}
          initialIndex={selected}
          title={title}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
