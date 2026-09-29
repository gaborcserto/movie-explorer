import './filter.scss';
import { useEffect, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import type { MovieSortField } from '@movie-explorer/contracts';
import CustomSelect from '../utility/customSelect';
import { sortOptions, genresFilter } from '../../data';
import {
  defaultSortOrder,
  sortOrderParams,
  sortParams,
} from '../../util/apiUtils';

function getSelectedOption(sortField?: MovieSortField): string {
  if (sortField === 'releaseDate') return 'Release Date';
  if (sortField === 'title') return 'Title';
  if (sortField === 'rating') return 'Rating';
  return 'Popularity';
}

const sortDirectionOptions = ['Ascending', 'Descending'];
const ratingOptions = [5, 6, 7, 8, 9];
const allGenresOption = 'All genres';
const anyRatingOption = 'Any rating';
const minimumReleaseYear = 1874;
const maximumReleaseYear = 9999;

function isValidReleaseYear(value: string): boolean {
  if (!/^\d{4}$/.test(value)) return false;
  const year = Number(value);
  return year >= minimumReleaseYear && year <= maximumReleaseYear;
}

interface FilterSelectProps {
  label: string;
  options: string[];
  selectedOption: string;
  styleName?: string;
  onChange: (selectedOptions: string[] | null) => void;
}

function FilterSelect({
  label,
  options,
  selectedOption,
  styleName = '',
  onChange,
}: FilterSelectProps) {
  return (
    <div className={`menu__control${styleName ? ` ${styleName}` : ''}`}>
      <span>{label}</span>
      <CustomSelect
        options={options}
        selectedOptions={[selectedOption]}
        onChange={onChange}
        styleName="menu__select"
        accessibleLabel={label}
      />
    </div>
  );
}

function Filter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const appliedReleaseYear = searchParams.get('year') ?? '';
  const [releaseYearInput, setReleaseYearInput] = useState(appliedReleaseYear);
  const { searchQuery } = useParams();
  const isSearch = Boolean(searchQuery);
  const sortField = isSearch
    ? undefined
    : sortParams(searchParams.get('sorting'));
  const sortOrder = sortOrderParams(searchParams.get('order'), sortField);
  const availableSortOptions = isSearch ? ['Relevance'] : sortOptions;
  const selectedOption = isSearch ? 'Relevance' : getSelectedOption(sortField);

  useEffect(() => {
    setReleaseYearInput(appliedReleaseYear);
  }, [appliedReleaseYear]);

  const updateParam = (name: string, value: string) => {
    const nextSearchParams = new URLSearchParams(searchParams);
    if (value) nextSearchParams.set(name, value);
    else nextSearchParams.delete(name);
    setSearchParams(nextSearchParams);
  };

  const handleSelectChange = (selectedOptions: string[] | null) => {
    const selected = sortParams(selectedOptions?.at(0));
    const nextSearchParams = new URLSearchParams(searchParams);

    if (isSearch) {
      nextSearchParams.delete('sorting');
      nextSearchParams.delete('order');
    } else if (selected) {
      nextSearchParams.set('sorting', selected);
      nextSearchParams.set('order', sortOrder ?? defaultSortOrder(selected));
    }

    if (nextSearchParams.toString() !== searchParams.toString()) {
      setSearchParams(nextSearchParams);
    }
  };

  const handleReleaseYearChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value.replace(/\D/g, '').slice(0, 4);
    setReleaseYearInput(nextValue);

    if (!nextValue) {
      updateParam('year', '');
    } else if (isValidReleaseYear(nextValue)) {
      updateParam('year', nextValue);
    }
  };

  const handleReleaseYearKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;

    event.preventDefault();
    const fallbackYear = new Date().getFullYear();
    const currentYear = isValidReleaseYear(releaseYearInput)
      ? Number(releaseYearInput)
      : fallbackYear;
    const direction = event.key === 'ArrowUp' ? 1 : -1;
    const nextYear = Math.min(
      maximumReleaseYear,
      Math.max(minimumReleaseYear, currentYear + direction)
    );
    const nextValue = String(nextYear);
    setReleaseYearInput(nextValue);
    updateParam('year', nextValue);
  };

  const handleDirectionChange = (selectedOptions: string[] | null) => {
    const selectedDirection = selectedOptions?.at(0);
    if (!sortField || !selectedDirection) return;

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set('sorting', sortField);
    nextSearchParams.set(
      'order',
      selectedDirection === 'Ascending' ? 'asc' : 'desc'
    );
    setSearchParams(nextSearchParams);
  };

  return (
    <section className="menu container" aria-label="Movie filters and sorting">
      <div className="menu__filters">
        <FilterSelect
          label="Genre"
          options={[allGenresOption, ...genresFilter]}
          selectedOption={searchParams.get('filter') ?? allGenresOption}
          onChange={(selectedOptions) =>
            updateParam(
              'filter',
              selectedOptions?.at(0) === allGenresOption
                ? ''
                : (selectedOptions?.at(0) ?? '')
            )
          }
        />
        <label className="menu__control menu__control--year">
          <span>Release year</span>
          <input
            className="menu__year-input"
            type="text"
            inputMode="numeric"
            maxLength={4}
            pattern="[0-9]{4}"
            autoComplete="off"
            aria-label="Release year"
            placeholder="Any Year"
            value={releaseYearInput}
            onChange={handleReleaseYearChange}
            onKeyDown={handleReleaseYearKeyDown}
            onBlur={() => setReleaseYearInput(appliedReleaseYear)}
          />
        </label>
        <FilterSelect
          label="Minimum rating"
          options={[
            anyRatingOption,
            ...ratingOptions.map((rating) => `${rating}+`),
          ]}
          selectedOption={
            searchParams.get('rating')
              ? `${searchParams.get('rating')}+`
              : anyRatingOption
          }
          onChange={(selectedOptions) =>
            updateParam(
              'rating',
              selectedOptions?.at(0) === anyRatingOption
                ? ''
                : (selectedOptions?.at(0)?.replace('+', '') ?? '')
            )
          }
        />
      </div>
      <div className="menu__short">
        <p className="menu__short__label">sort by</p>
        <CustomSelect
          options={availableSortOptions}
          selectedOptions={[selectedOption]}
          onChange={handleSelectChange}
          styleName="menu__short__select"
          accessibleLabel="Sort field"
        />
        {sortField && sortOrder && (
          <CustomSelect
            options={sortDirectionOptions}
            selectedOptions={[sortOrder === 'asc' ? 'Ascending' : 'Descending']}
            onChange={handleDirectionChange}
            styleName="menu__short__select menu__short__select--direction"
            accessibleLabel="Sort direction"
          />
        )}
      </div>
    </section>
  );
}

export default Filter;
