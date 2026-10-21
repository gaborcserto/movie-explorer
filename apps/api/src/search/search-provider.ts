import type { SearchResponse, SearchType } from '@movie-explorer/contracts';

export const SEARCH_PROVIDER = Symbol('SEARCH_PROVIDER');

export interface SearchProvider {
  find(
    query: string,
    type: SearchType,
    page: number,
    year?: number,
  ): Promise<SearchResponse>;
}
