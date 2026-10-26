import type {
  SeriesDetails,
  SeasonDetails,
  EpisodeDetails,
  EpisodeCredits,
  SeriesCredits,
  SeriesImages,
  SeriesVideos,
} from '@movie-explorer/contracts';

import {
  record,
  availability,
  availabilityMap,
  movieSection,
} from './partialValidation';

function integer(value: unknown, minimum = 0): value is number {
  return (
    typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum
  );
}

function text(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function strings(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}

function nullableText(value: unknown) {
  return value === null || typeof value === 'string';
}

function date(value: unknown) {
  return (
    value === null ||
    (typeof value === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      Number.isFinite(Date.parse(value)) &&
      new Date(value).toISOString().slice(0, 10) === value)
  );
}

function count(value: unknown) {
  return value === null || integer(value);
}
function rating(value: unknown) {
  return (
    value === null ||
    (typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= 0 &&
      value <= 10)
  );
}

function person(value: unknown) {
  return (
    record(value) &&
    text(value.name) &&
    (value.id === undefined || integer(value.id, 1)) &&
    ['profileUrl', 'profileSrcSet'].every(
      (key) => value[key] === undefined || typeof value[key] === 'string'
    )
  );
}

function seasonSummary(value: unknown) {
  return (
    record(value) &&
    integer(value.id, 1) &&
    integer(value.seasonNumber) &&
    text(value.title) &&
    nullableText(value.description) &&
    nullableText(value.posterUrl) &&
    date(value.airDate) &&
    count(value.episodeCount) &&
    (value.posterSrcSet === undefined || typeof value.posterSrcSet === 'string')
  );
}

function organization(value: unknown) {
  return (
    record(value) &&
    integer(value.id, 1) &&
    text(value.name) &&
    nullableText(value.logoUrl) &&
    nullableText(value.originCountry)
  );
}

export function seriesDetails(
  value: unknown,
  id: number
): value is SeriesDetails {
  return (
    record(value) &&
    value.id === id &&
    value.mediaType === 'tv' &&
    text(value.title) &&
    [
      'originalTitle',
      'posterUrl',
      'description',
      'originalLanguage',
      'status',
      'backdropUrl',
    ].every((key) => nullableText(value[key])) &&
    (value.posterSrcSet === undefined ||
      typeof value.posterSrcSet === 'string') &&
    date(value.firstAirDate) &&
    date(value.lastAirDate) &&
    (value.inProduction === null || typeof value.inProduction === 'boolean') &&
    count(value.seasonCount) &&
    count(value.episodeCount) &&
    count(value.voteCount) &&
    rating(value.rating) &&
    strings(value.genres) &&
    strings(value.originCountries) &&
    value.originCountries.every((code) => /^[A-Z]{2}$/.test(code)) &&
    Array.isArray(value.episodeRuntimeMinutes) &&
    value.episodeRuntimeMinutes.every((item) => integer(item, 1)) &&
    Array.isArray(value.creators) &&
    value.creators.every(person) &&
    Array.isArray(value.networks) &&
    value.networks.every(organization) &&
    Array.isArray(value.productionCompanies) &&
    value.productionCompanies.every(organization) &&
    Array.isArray(value.seasons) &&
    value.seasons.every(seasonSummary) &&
    new Set(value.seasons.map((item) => item.seasonNumber)).size ===
      value.seasons.length
  );
}

function episodeSummary(
  value: unknown,
  id: number,
  season: number,
  episode?: number
) {
  return (
    record(value) &&
    integer(value.id, 1) &&
    value.seriesId === id &&
    value.seasonNumber === season &&
    integer(value.episodeNumber, 1) &&
    (episode === undefined || value.episodeNumber === episode) &&
    text(value.title) &&
    nullableText(value.description) &&
    nullableText(value.stillUrl) &&
    (value.stillSrcSet === undefined ||
      typeof value.stillSrcSet === 'string') &&
    date(value.airDate) &&
    (value.runtimeMinutes === null || integer(value.runtimeMinutes, 1)) &&
    rating(value.rating) &&
    count(value.voteCount)
  );
}

export function seasonDetails(
  value: unknown,
  id: number,
  season: number
): value is SeasonDetails {
  if (
    !record(value) ||
    !seasonSummary(value) ||
    value.seriesId !== id ||
    value.seasonNumber !== season ||
    !Array.isArray(value.episodes) ||
    value.episodeCount !== value.episodes.length ||
    !value.episodes.every((item) => episodeSummary(item, id, season))
  ) {
    return false;
  }
  const { episodes } = value;

  return (
    new Set(episodes.map((item) => item.id)).size === episodes.length &&
    episodes.every(
      (item, index) =>
        index === 0 || episodes[index - 1].episodeNumber < item.episodeNumber
    )
  );
}

export function episodeCredits(value: unknown): value is EpisodeCredits {
  return (
    record(value) &&
    availabilityMap(value.sections, ['cast', 'guestStars', 'crew']) &&
    ['cast', 'guestStars'].every(
      (key) =>
        Array.isArray(value[key]) &&
        value[key].every(
          (item: unknown) =>
            record(item) && person(item) && strings(item.characters)
        )
    ) &&
    Array.isArray(value.crew) &&
    value.crew.every(
      (item: unknown) =>
        record(item) &&
        person(item) &&
        nullableText(item.department) &&
        strings(item.jobs)
    )
  );
}

export function episodeDetails(
  value: unknown,
  id: number,
  season: number,
  episode: number
): value is EpisodeDetails {
  return (
    record(value) &&
    episodeSummary(value, id, season, episode) &&
    episodeCredits(value.credits)
  );
}

export function seriesCredits(value: unknown): value is SeriesCredits {
  return (
    record(value) &&
    availabilityMap(value.sections, ['cast', 'crew']) &&
    ['cast', 'crew'].every(
      (kind) =>
        Array.isArray(value[kind]) &&
        value[kind].every((item: unknown) => {
          if (
            !record(item) ||
            !person(item) ||
            (kind === 'cast'
              ? !count(item.totalEpisodeCount)
              : !Array.isArray(item.departments) ||
                !item.departments.every(
                  (department: unknown) =>
                    record(department) &&
                    nullableText(department.department) &&
                    count(department.totalEpisodeCount)
                ))
          ) {
            return false;
          }
          const roles = item[kind === 'cast' ? 'characters' : 'jobs'];

          return (
            Array.isArray(roles) &&
            roles.every(
              (role: unknown) =>
                record(role) &&
                nullableText(role.creditId) &&
                count(role.episodeCount) &&
                (kind === 'cast'
                  ? nullableText(role.character)
                  : nullableText(role.job) && nullableText(role.department))
            )
          );
        })
    )
  );
}

export function seriesImages(value: unknown): value is SeriesImages {
  return (
    record(value) &&
    availabilityMap(value.sections, ['posters', 'backdrops']) &&
    movieSection(value, 'posters') &&
    movieSection({ photos: value.backdrops }, 'photos')
  );
}

export function seriesVideos(value: unknown): value is SeriesVideos {
  return (
    record(value) &&
    availability(value.availability) &&
    movieSection(value, 'videos')
  );
}
