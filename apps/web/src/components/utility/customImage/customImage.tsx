import { useState } from 'react';
import { FaImage } from 'react-icons/fa6';
import ImagePreview from './imagePreview';
import './customImage.scss';

interface MovieImageProps {
  src?: string;
  srcSet?: string;
  previewSrc?: string;
  sizes?: string;
  loading?: 'lazy' | 'eager';
  alt: string;
  className: string;
}

function MovieImageContent({
  src,
  srcSet,
  previewSrc,
  sizes,
  loading = 'lazy',
  alt,
  className,
}: MovieImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const showFallback = !src || failed;

  if (showFallback) {
    return (
      <div className={className}>
        <div
          className={`${className}__placeholder image-placeholder`}
          role="img"
          aria-label={alt}
        >
          <FaImage aria-hidden="true" focusable="false" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${className}${previewSrc ? ' movie-image--progressive' : ''}`}
    >
      <img
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        className={`${className}__img${previewSrc ? ' image-original--progressive' : ''}`}
        loading={loading}
        decoding="async"
        style={{ opacity: loaded ? 1 : 0 }}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
      {previewSrc && !showFallback && (
        <ImagePreview src={previewSrc} visible={!loaded} />
      )}
    </div>
  );
}

function MovieImage({
  src,
  srcSet,
  sizes,
  previewSrc,
  ...props
}: MovieImageProps) {
  const sourceKey = JSON.stringify([src, srcSet, sizes, previewSrc]);

  return (
    <MovieImageContent
      key={sourceKey}
      src={src}
      srcSet={srcSet}
      sizes={sizes}
      previewSrc={previewSrc}
      {...props}
    />
  );
}

export default MovieImage;
