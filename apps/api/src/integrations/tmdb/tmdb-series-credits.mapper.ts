import type {
  SeriesCredits,
  SeriesCastMember,
  SeriesCrewMember,
  SeriesCharacter,
  SeriesJob,
} from '@movie-explorer/contracts';

import { TmdbImageMapper } from './tmdb-image.mapper';
import {
  seriesRecord,
  seriesText,
  seriesCount,
  seriesPositiveId,
} from './tmdb-series.validation';

export class TmdbSeriesCreditsMapper {
  private readonly images: TmdbImageMapper;

  constructor(imageBaseUrl: string) {
    this.images = new TmdbImageMapper(imageBaseUrl);
  }

  map(value: unknown): SeriesCredits {
    const source = seriesRecord(value);
    const cast = this.people(
      source?.success === false ? undefined : source?.cast,
      'cast',
    );
    const crew = this.people(
      source?.success === false ? undefined : source?.crew,
      'crew',
    );
    return {
      cast: cast.cast,
      crew: crew.crew,
      sections: {
        cast: { status: cast.valid ? 'available' : 'unavailable' },
        crew: { status: crew.valid ? 'available' : 'unavailable' },
      },
    };
  }

  private people(value: unknown, kind: 'cast' | 'crew') {
    const cast = new Map<number, SeriesCastMember>();
    const crew = new Map<number, SeriesCrewMember>();
    let valid = Array.isArray(value);
    const rows: unknown[] = Array.isArray(value) ? [...value] : [];
    if (kind === 'cast') {
      rows.sort(
        (a, b) =>
          (seriesCount(seriesRecord(a)?.order) ?? Number.MAX_SAFE_INTEGER) -
          (seriesCount(seriesRecord(b)?.order) ?? Number.MAX_SAFE_INTEGER),
      );
    }
    for (const item of rows) {
      const row = seriesRecord(item);
      const id = seriesPositiveId(row?.id);
      const name = seriesText(row?.name);
      if (!row || !id || !name) {
        valid = false;
        continue;
      }
      const roles = row[kind === 'cast' ? 'roles' : 'jobs'];
      if (!Array.isArray(roles)) {
        valid = false;
        continue;
      }
      const person = this.images.toPersonReference({
        id,
        name,
        profile_path: seriesText(row.profile_path),
      });
      const previous = kind === 'cast' ? cast.get(id) : crew.get(id);
      // Preserve the first identity and flag conflicting upstream records for recovery.
      if (previous && previous.name !== name) {
        valid = false;
      }
      const characters: SeriesCharacter[] = [];
      const jobs: SeriesJob[] = [];
      for (const value of roles) {
        const role = seriesRecord(value);
        if (!role) {
          valid = false;
          continue;
        }
        const common = {
          creditId: seriesText(role.credit_id),
          episodeCount: seriesCount(role.episode_count),
        };
        if (kind === 'cast') {
          characters.push({ ...common, character: seriesText(role.character) });
        } else {
          jobs.push({
            ...common,
            job: seriesText(role.job),
            department: seriesText(row.department),
          });
        }
      }
      if (kind === 'cast') {
        const previousCast = cast.get(id);
        const total =
          previousCast?.totalEpisodeCount ??
          seriesCount(row.total_episode_count);
        if (
          previousCast?.totalEpisodeCount != null &&
          seriesCount(row.total_episode_count) != null &&
          previousCast.totalEpisodeCount !== row.total_episode_count
        ) {
          valid = false;
        }
        cast.set(id, {
          ...(cast.get(id) ?? person),
          totalEpisodeCount: total,
          characters: this.distinct([
            ...(cast.get(id)?.characters ?? []),
            ...characters,
          ]),
        });
      } else {
        crew.set(id, {
          ...(crew.get(id) ?? person),
          departments: [
            ...new Map(
              [
                ...(crew.get(id)?.departments ?? []),
                {
                  department: seriesText(row.department),
                  totalEpisodeCount: seriesCount(row.total_episode_count),
                },
              ].map((department) => [JSON.stringify(department), department]),
            ).values(),
          ],
          jobs: this.distinct([...(crew.get(id)?.jobs ?? []), ...jobs]),
        });
      }
    }
    return { cast: [...cast.values()], crew: [...crew.values()], valid };
  }

  private distinct<T extends SeriesCharacter | SeriesJob>(roles: T[]): T[] {
    return [
      ...new Map(roles.map((role) => [JSON.stringify(role), role])).values(),
    ];
  }
}
