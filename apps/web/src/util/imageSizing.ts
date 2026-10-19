/** Keep provider originals for the viewer, never for routine display at DPR 3. */
export function getDisplaySrcSet(srcSet?: string) {
  return srcSet
    ?.split(',')
    .filter((candidate) => {
      const density = candidate.match(/\s(\d+(?:\.\d+)?)x\s*$/)?.[1];
      return !density || Number(density) <= 2;
    })
    .join(',');
}

/** Use only supplied URLs; width variants let the browser account for card size. */
export function getPosterDisplaySrcSet(src?: string, srcSet?: string) {
  const display = getDisplaySrcSet(srcSet);
  if (!display) {
    return undefined;
  }

  const urls = [
    ...new Set(
      [
        src,
        ...display
          .split(',')
          .map((candidate) => candidate.trim().split(/\s+/)[0]),
      ].filter((url): url is string => Boolean(url))
    ),
  ];
  const candidates = urls.map((url) => ({
    url,
    width: Number(url.match(/\/w(\d+)\/[^/]+$/)?.[1]),
  }));

  // Custom provider URLs need not encode widths. Keep their density semantics.
  if (candidates.some(({ width }) => !width)) {
    return display;
  }

  return candidates
    .sort((first, second) => first.width - second.width)
    .map(({ url, width }) => `${url} ${width}w`)
    .join(', ');
}
