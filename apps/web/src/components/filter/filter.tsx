import './filter.scss';
import { useParams, useSearchParams, Link } from 'react-router-dom';
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

function Filter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { searchQuery } = useParams();
  const isSearch = Boolean(searchQuery);
  const filter = searchParams.get('filter');
  const sortField = isSearch
    ? undefined
    : sortParams(searchParams.get('sorting'));
  const sortOrder = sortOrderParams(searchParams.get('order'), sortField);
  const availableSortOptions = isSearch ? ['Relevance'] : sortOptions;

  const selectedOption = isSearch ? 'Relevance' : getSelectedOption(sortField);

  const handleSelectChange = (selectedOptions: string[] | null) => {
    const selected = sortParams(selectedOptions?.at(0));
    const nextSearchParams = new URLSearchParams(searchParams);

    if (isSearch) {
      nextSearchParams.delete('sorting');
      nextSearchParams.delete('order');
    }

    if (selected) {
      nextSearchParams.set('sorting', selected);
      nextSearchParams.set('order', sortOrder ?? defaultSortOrder(selected));
    } else {
      nextSearchParams.delete('sorting');
      nextSearchParams.delete('order');
    }

    if (nextSearchParams.toString() !== searchParams.toString()) {
      setSearchParams(nextSearchParams);
    }
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

  const getGenreUrl = (genre?: string) => {
    const nextSearchParams = new URLSearchParams(searchParams);

    if (isSearch) {
      nextSearchParams.delete('sorting');
      nextSearchParams.delete('order');
    }

    if (genre) nextSearchParams.set('filter', genre);
    else nextSearchParams.delete('filter');

    const query = nextSearchParams.toString();
    return query ? `?${query}` : '';
  };

  return (
    <nav className="menu container" aria-label="Movie filters and sorting">
      <div className="menu__filters">
        <Link
          to={getGenreUrl()}
          className={`menu__link ${!filter ? 'menu__link--active' : ''}`}
        >
          all
        </Link>
        {genresFilter.map((genre) => (
          <Link
            to={getGenreUrl(genre)}
            className={`menu__link ${
              filter === genre ? 'menu__link--active' : ''
            }`}
            key={genre}
          >
            {genre}
          </Link>
        ))}
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
    </nav>
  );
}

export default Filter;
