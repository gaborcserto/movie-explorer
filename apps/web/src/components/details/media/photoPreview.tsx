import { useTranslation } from 'react-i18next';
import { useEffect, useRef, useState } from 'react';
import type { MoviePhoto } from '@movie-explorer/contracts';

import { i18n } from '../../../i18n';
import { photoDescription } from '../../../i18n/labels';
import MovieImage from '../../utility/customImage';
import { Lightbox } from '../../lightbox';

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

function PhotoPreviewContent({
  photos,
  title,
  portrait,
  category,
}: Omit<Props, 'resetKey'>) {
  useTranslation();

  const [selected, setSelected] = useState<number | null>(null);
  const lastPhotoRef = useRef<HTMLButtonElement>(null);
  const focusLastPhoto = useRef(false);

  const seen = new Set<string>();
  const available = photos.filter((photo) => {
    if (!photo.fullUrl?.trim() || seen.has(photo.fullUrl)) {
      return false;
    }

    seen.add(photo.fullUrl);

    return true;
  });

  const plural = category ?? 'photos';
  const batchSize = PHOTO_BATCH_SIZES[plural];

  const [visibleCount, setVisibleCount] = useState<number>(batchSize);
  const visiblePhotos = available.slice(0, visibleCount);

  useEffect(() => {
    if (!focusLastPhoto.current) {
      return;
    }

    focusLastPhoto.current = false;
    lastPhotoRef.current?.focus({ preventScroll: true });
  }, [visibleCount]);

  return (
    <>
      <div className="media-preview__summary">
        <span>
          {i18n.t('messages.availableCount', {
            count: available.length,
            kind: i18n.t(`nouns.${plural}`, { count: available.length }),
          })}
        </span>
        {visibleCount < available.length && (
          <button
            type="button"
            className="btn btn--outline btn--mobile-full"
            aria-label={i18n.t('messages.morePhotos', {
              category: i18n.t(`mediaKinds.${plural}`),
              title,
            })}
            onClick={() => {
              focusLastPhoto.current =
                visibleCount + batchSize >= available.length;
              setVisibleCount((count) => count + batchSize);
            }}
          >
            {i18n.t('ui.show_more')}
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
            aria-label={i18n.t('messages.viewPhoto', {
              title,
              category: i18n.t(`nouns.${category ?? 'photos'}`, { count: 1 }),
              number: index + 1,
            })}
            aria-haspopup="dialog"
            onClick={() => setSelected(index)}
          >
            <MovieImage
              src={photo.thumbnailUrl}
              alt={
                (photo.alt ? photoDescription(photo.alt) : undefined) ??
                i18n.t('messages.photoAlt', {
                  title,
                  category: category
                    ? i18n.t(`nouns.${category}`, { count: 1 })
                    : i18n.t('messages.stillKind'),
                  number: index + 1,
                })
              }
              className="media-thumbnail"
            />
          </button>
        ))}
      </div>
      {selected !== null && (
        <Lightbox
          type="photo"
          photos={available}
          initialIndex={selected}
          title={title}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

export default function PhotoPreview({ resetKey, category, ...props }: Props) {
  useTranslation();

  return (
    <PhotoPreviewContent
      key={`${resetKey ?? ''}:${category ?? 'photos'}`}
      category={category}
      {...props}
    />
  );
}
