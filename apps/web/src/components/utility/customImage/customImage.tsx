import { useState } from 'react';
import placeholderImage from '../../../assets/img/noimage.png';

interface MovieImageProps {
  src?: string;
  srcSet?: string;
  sizes?: string;
  loading?: 'lazy' | 'eager';
  alt: string;
  className: string;
}

function MovieImageContent({
  src,
  srcSet,
  sizes,
  loading = 'lazy',
  alt,
  className,
}: MovieImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const showFallback = !src || failed;

  return (
    <div
      className={className}
      style={
        !loaded && !showFallback
          ? {
              backgroundImage: `url(${placeholderImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined
      }
    >
      <img
        src={showFallback ? placeholderImage : src}
        srcSet={showFallback ? undefined : srcSet}
        sizes={showFallback ? undefined : sizes}
        alt={alt}
        className={`${className}__img`}
        loading={loading}
        decoding="async"
        style={{ opacity: loaded || showFallback ? 1 : 0 }}
        onLoad={() => setLoaded(true)}
        onError={showFallback ? undefined : () => setFailed(true)}
      />
    </div>
  );
}

function MovieImage({ src, srcSet, sizes, ...props }: MovieImageProps) {
  const sourceKey = JSON.stringify([src, srcSet, sizes]);

  return (
    <MovieImageContent
      key={sourceKey}
      src={src}
      srcSet={srcSet}
      sizes={sizes}
      {...props}
    />
  );
}

export default MovieImage;
