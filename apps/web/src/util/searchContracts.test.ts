import { expectTypeOf } from 'vitest';
import type {
  MovieSuggestion,
  PersonListResponse,
  PersonSummary,
  SearchSuggestion,
  SearchSuggestionsResponse,
} from '@movie-explorer/contracts';

// These assertions run with Vitest and are also checked by the web TypeScript task.
test('public suggestions discriminate media types while retaining movie-only compatibility', () => {
  expectTypeOf<
    SearchSuggestionsResponse['suggestions'][number]
  >().toEqualTypeOf<SearchSuggestion>();
  expectTypeOf<
    Extract<SearchSuggestion, { mediaType: 'movie' }>
  >().toEqualTypeOf<MovieSuggestion & { mediaType: 'movie' }>();
  expectTypeOf<
    Extract<SearchSuggestion, { mediaType: 'person' }>
  >().toEqualTypeOf<PersonSummary & { mediaType: 'person' }>();
});

test('person pagination and optional display metadata remain application-owned', () => {
  expectTypeOf<PersonListResponse['people']>().toEqualTypeOf<PersonSummary[]>();
  expectTypeOf<PersonListResponse>()
    .pick<'page' | 'totalPages' | 'totalResults'>()
    .toEqualTypeOf<{
      page: number;
      totalPages: number;
      totalResults: number;
    }>();
  expectTypeOf<PersonSummary['profileUrl']>().toEqualTypeOf<
    string | undefined
  >();
  expectTypeOf<PersonSummary['knownForDepartment']>().toEqualTypeOf<
    string | undefined
  >();
});
