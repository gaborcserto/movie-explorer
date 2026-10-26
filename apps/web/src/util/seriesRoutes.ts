export function seriesPath(
  id: number | string,
  seasonNumber?: number | string,
  episodeNumber?: number | string
) {
  const series = `/series/${id}`;

  if (seasonNumber === undefined) {
    return series;
  }

  const season = `${series}/seasons/${seasonNumber}`;

  return episodeNumber === undefined
    ? season
    : `${season}/episodes/${episodeNumber}`;
}

export function mediaPath(mediaType: 'movie' | 'tv' | 'person', id: number) {
  return mediaType === 'tv' ? seriesPath(id) : `/${mediaType}/${id}`;
}
