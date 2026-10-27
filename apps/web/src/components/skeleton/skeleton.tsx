import type { CSSProperties, ReactNode } from 'react';

import './skeleton.scss';

export default function Skeleton({
  width,
  height,
  radius,
  circle = false,
  className = '',
}: {
  width?: CSSProperties['width'];
  height?: CSSProperties['height'];
  radius?: CSSProperties['borderRadius'];
  circle?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`skeleton ${className}`}
      aria-hidden="true"
      style={{ width, height, borderRadius: circle ? '50%' : radius }}
    />
  );
}

export function SkeletonRegion({
  label,
  className = '',
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className} aria-busy="true" aria-label={label}>
      <span className="visually-hidden" role="status">
        {label}
      </span>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}
