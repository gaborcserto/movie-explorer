import { useState } from 'react';
import type { MoviePhoto } from '@movie-explorer/contracts';
import MovieImage from '../utility/customImage';
import PhotoLightbox from './photoLightbox';
import {
  getDisplaySrcSet,
  getPosterDisplaySrcSet,
} from '../../util/imageSizing';
import './heroImage.scss';

interface Props {
  src?: string;
  srcSet?: string;
  fullSrcSet?: string;
  previewSrc?: string;
  sizes?: string;
  alt: string;
  title: string;
  className: string;
}

function getHighestResolution(src: string, srcSet?: string) {
  const candidates = srcSet
    ?.split(',')
    .map((candidate) => {
      const [url, descriptor] = candidate.trim().split(/\s+/);
      const amount = Number.parseFloat(descriptor ?? '1');
      const multiplier = descriptor?.endsWith('w') ? amount / 1000 : amount;
      return { url, multiplier };
    })
    .filter(({ url, multiplier }) => url && Number.isFinite(multiplier));

  return (
    candidates?.reduce(
      (highest, candidate) =>
        candidate.multiplier > highest.multiplier ? candidate : highest,
      { url: src, multiplier: 1 }
    ).url ?? src
  );
}

function HeroImageContent({
  src,
  srcSet,
  fullSrcSet,
  previewSrc,
  sizes,
  alt,
  title,
  className,
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const fullUrl = src ? getHighestResolution(src, fullSrcSet ?? srcSet) : '';
  const photo: MoviePhoto = { thumbnailUrl: src ?? '', fullUrl, alt };

  const image = (
    <MovieImage
      src={failed ? undefined : src}
      srcSet={getPosterDisplaySrcSet(src, srcSet) ?? getDisplaySrcSet(srcSet)}
      previewSrc={previewSrc}
      sizes={sizes}
      loading="eager"
      alt={alt}
      className="hero-image__media"
      onImageLoad={() => setLoaded(true)}
      onImageError={() => {
        setLoaded(false);
        setFailed(true);
      }}
    />
  );

  return (
    <>
      {src && !failed ? (
        <button
          type="button"
          disabled={!loaded}
          className={`hero-image${loaded ? ' hero-image--loaded' : ''} ${className}`}
          aria-label={alt}
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
        >
          {image}
        </button>
      ) : (
        <div className={className}>{image}</div>
      )}
      {open && loaded && (
        <PhotoLightbox
          photos={[photo]}
          initialIndex={0}
          title={title}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

export default function HeroImage(props: Props) {
  const { src } = props;
  return <HeroImageContent key={src ?? 'no-image'} {...props} />;
}
