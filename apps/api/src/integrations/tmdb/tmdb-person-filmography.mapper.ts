import type {
  PersonSeriesCredit,
  PersonActingRole,
} from '@movie-explorer/contracts';

import { TmdbImageMapper } from './tmdb-image.mapper';
import {
  seriesRecord,
  seriesPositiveId,
  seriesText,
  seriesDate,
  seriesCount,
} from './tmdb-series.validation';
import { isTmdbPersonMovieCredits } from './tmdb-person.mapper';

export class TmdbPersonFilmographyMapper {
  private readonly images: TmdbImageMapper;

  constructor(imageBaseUrl: string) {
    this.images = new TmdbImageMapper(imageBaseUrl);
  }

  series(value: unknown): PersonSeriesCredit[] {
    if (!isTmdbPersonMovieCredits(value)) {
      throw new Error('Invalid person series credits');
    }
    const titles = new Map<number, PersonSeriesCredit>();
    const add = (value: unknown, acting: boolean) => {
      const row = seriesRecord(value);
      const id = seriesPositiveId(row?.id);
      const title = seriesText(row?.name);
      if (!row || row.adult === true || !id || !title) {
        return;
      }
      const path = seriesText(row.poster_path);
      const entry: PersonSeriesCredit = titles.get(id) ?? {
        mediaType: 'tv',
        id,
        title,
        originalTitle: seriesText(row.original_name),
        firstAirDate: seriesDate(row.first_air_date),
        posterUrl: this.images.toImageUrl(path) || null,
        ...(path && { posterSrcSet: this.images.toPosterSrcSet(path) }),
        genres: [],
        crewCredits: [],
      };
      if (acting) {
        entry.actingCredits ??= [];
        entry.actingRoles ??= [];
        const character = seriesText(row.character);
        if (character && !entry.actingCredits.includes(character)) {
          entry.actingCredits.push(character);
        }
        const role: PersonActingRole = {
          creditId: seriesText(row.credit_id),
          character,
          episodeCount: seriesCount(row.episode_count),
        };
        if (
          !entry.actingRoles.some(
            (previous) => JSON.stringify(previous) === JSON.stringify(role),
          )
        ) {
          entry.actingRoles.push(role);
        }
      } else {
        const job = seriesText(row.job);
        const department = seriesText(row.department);
        const credit = {
          ...(job && { job }),
          ...(department && { department }),
          ...(seriesText(row.credit_id) && {
            creditId: seriesText(row.credit_id),
          }),
          episodeCount: seriesCount(row.episode_count),
        };
        if (
          !entry.crewCredits.some(
            (previous) => JSON.stringify(previous) === JSON.stringify(credit),
          )
        ) {
          entry.crewCredits.push(credit);
        }
      }
      titles.set(id, entry);
    };
    value.cast.forEach((row) => add(row, true));
    value.crew.forEach((row) => add(row, false));
    return [...titles.values()];
  }
}
