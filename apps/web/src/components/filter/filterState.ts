import { genresFilter } from '../../data';
import { sortParams, sortOrderParams } from '../../util/apiUtils';

export const ratingOptions = Array.from({ length: 20 }, (_, index) =>
  String((index + 1) / 2)
);
export const validYear = (value: string) =>
  /^\d{4}$/.test(value) && Number(value) >= 1874 && Number(value) <= 9999;

export function readSearchView(params: URLSearchParams) {
  const view = params.get('view');

  return view === 'discover' ||
    view === 'all' ||
    view === 'tv' ||
    view === 'people'
    ? view
    : 'movies';
}

export function readFilters(params: URLSearchParams, isSearch: boolean) {
  const genres = Array.from(
    new Set(
      params
        .getAll('filter')
        .flatMap((value) => value.split(','))
        .map((genre) => genre.trim().toLowerCase())
        .filter((genre) => genresFilter.includes(genre))
    )
  ).sort(
    (first, second) =>
      genresFilter.indexOf(first) - genresFilter.indexOf(second)
  );
  const year = params.get('year') ?? '';
  const rating = params.get('rating') ?? '';
  const sorting = sortParams(params.get('sorting')) ?? 'popularity';

  return {
    filter: genres,
    year: validYear(year) ? year : '',
    rating: ratingOptions.includes(rating) ? rating : '',
    sorting: isSearch ? 'popularity' : sorting,
    order: isSearch ? 'desc' : sortOrderParams(params.get('order'), sorting),
  };
}

export type FilterValues = ReturnType<typeof readFilters>;

export function writeFilters(
  params: URLSearchParams,
  values: FilterValues,
  isSearch: boolean
) {
  const next = new URLSearchParams(params);
  const omitSorting =
    isSearch || (values.sorting === 'popularity' && values.order === 'desc');
  const entries = {
    ...values,
    sorting: omitSorting ? '' : values.sorting,
    order: omitSorting ? '' : values.order,
  };
  Object.entries(entries).forEach(([key, value]) => {
    if (key === 'filter') {
      const genres = Array.isArray(value) ? value : [];

      if (genres.length) {
        next.set('filter', genres.join(','));
      } else {
        next.delete('filter');
      }

      return;
    }

    if (value) next.set(key, String(value));
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
