import { useState, useEffect } from 'react';
import placeholderImage from '../../../assets/img/noimage.png';

interface MovieImageProps {
  src?: string;
  alt: string;
  className: string;
}

function MovieImage({ src, alt, className }: MovieImageProps) {
  const [displayedSrc, setDisplayedSrc] = useState(placeholderImage);

  useEffect(() => {
    let isCurrent = true;

    setDisplayedSrc(placeholderImage);
    if (src) {
      const image = new Image();
      image.src = src;
      image.onload = () => {
        if (isCurrent) setDisplayedSrc(src);
      };
      image.onerror = () => {
        if (isCurrent) setDisplayedSrc(placeholderImage);
      };
    }

    return () => {
      isCurrent = false;
    };
  }, [src]);

  return (
    <div className={className}>
      <img
        src={displayedSrc}
        alt={alt}
        className={`${className}__img`}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}

export default MovieImage;
