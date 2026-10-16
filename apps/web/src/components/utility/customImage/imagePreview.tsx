import { useState } from 'react';
import './imagePreview.scss';

export default function ImagePreview({
  src,
  visible,
  className = '',
}: {
  src: string;
  visible: boolean;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      className={`image-preview ${className}`}
      draggable={false}
      decoding="async"
      style={{ opacity: visible && loaded && !failed ? 1 : 0 }}
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
    />
  );
}
