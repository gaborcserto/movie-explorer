import { genresFilter } from '../../data';
import {
  defaultSortOrder,
  sortParams,
  sortOrderParams,
} from '../../util/apiUtils';

export const ratingOptions = ['5', '6', '7', '8', '9'];
export const validYear = (value: string) =>
  /^\d{4}$/.test(value) && Number(value) >= 1874 && Number(value) <= 9999;

export function readSearchView(params: URLSearchParams) {
  const view = params.get('view');
  return view === 'all' || view === 'tv' || view === 'people' ? view : 'movies';
}

export function readFilters(params: URLSearchParams, isSearch: boolean) {
  const genre = params.get('filter') ?? '';
  const year = params.get('year') ?? '';
  const rating = params.get('rating') ?? '';
  const sorting = sortParams(params.get('sorting')) ?? 'popularity';
  return {
    filter: genresFilter.includes(genre) ? genre : '',
    year: validYear(year) ? year : '',
    rating: ratingOptions.includes(rating) ? rating : '',
    sorting: isSearch ? 'popularity' : sorting,
    order: isSearch
      ? 'desc'
      : (sortOrderParams(params.get('order'), sorting) ??
        defaultSortOrder(sorting)),
  };
}

export type FilterValues = ReturnType<typeof readFilters>;

export function writeFilters(
  params: URLSearchParams,
  values: FilterValues,
  isSearch: boolean
) {
  const next = new URLSearchParams(params);
  const entries = {
    ...values,
    sorting:
      isSearch || (values.sorting === 'popularity' && values.order === 'desc')
        ? ''
        : values.sorting,
    order:
      isSearch || (values.sorting === 'popularity' && values.order === 'desc')
        ? ''
        : values.order,
  };
  Object.entries(entries).forEach(([key, value]) => {
    if (value) next.set(key, value);
    else next.delete(key);
  });
  return next;
}

export function normalizeFilters(params: URLSearchParams, isSearch: boolean) {
  return writeFilters(params, readFilters(params, isSearch), isSearch);
}

export function normalizeSearchFilters(
  params: URLSearchParams,
  isSearch: boolean
) {
  const next = normalizeFilters(params, isSearch);
  const view = readSearchView(params);
  if (view === 'movies' || (view === 'all' && !isSearch)) next.delete('view');
  else next.set('view', view);
  return next;
}
