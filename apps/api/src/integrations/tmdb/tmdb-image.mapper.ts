import type { CreditPerson } from '@movie-explorer/contracts';

export class TmdbImageMapper {
  readonly originalImageBaseUrl: string;

  constructor(private readonly imageBaseUrl: string) {
    const parts = imageBaseUrl.split('/');
    parts[parts.length - 1] = 'original';
    this.originalImageBaseUrl = parts.join('/');
  }

  toImageUrl(path: string | null): string {
    return path ? `${this.imageBaseUrl}${path}` : '';
  }

  toSrcSet(path: string, candidates: [string, string][]): string {
    const baseUrl = this.originalImageBaseUrl.replace(/\/original$/, '');

    return candidates
      .map(([size, descriptor]) => `${baseUrl}/${size}${path} ${descriptor}`)
      .join(', ');
  }

  toPosterSrcSet(path: string): string {
    // Preserve the existing movie poster density candidates.
    return this.toSrcSet(path, [
      ['w342', '1x'],
      ['w780', '2x'],
      ['original', '3x'],
    ]);
  }

  public toPersonReference(person: {
    id?: number;
    name: string;
    profile_path?: string | null;
  }): CreditPerson {
    return {
      ...(Number.isSafeInteger(person.id) &&
        person.id > 0 && { id: person.id }),
      name: person.name.trim(),
      ...(person.profile_path && {
        profileUrl: this.toImageUrl(person.profile_path),
        profileSrcSet: this.toSrcSet(person.profile_path, [
          ['w185', '1x'],
          ['h632', '2x'],
          ['original', '3x'],
        ]),
      }),
    };
  }
}
