import './filter.scss';
import { useSearchParams, Link } from 'react-router-dom';
import CustomSelect from '../utility/customSelect';
import { sortOptions, genresFilter } from '../../data';
import { sortParams } from '../../util/apiUtils';

function Filter() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filter = searchParams.get('filter');
  const sort = searchParams.get('sorting');
  const searchParamsUrl = searchParams.toString();

  const formatOption = (text: string) =>
    text
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' ')
      .toLowerCase();

  const selectedOption = formatOption(sort ?? 'title');

  const handleSelectChange = (selectedOptions: string[] | null) => {
    const selected = sortParams(selectedOptions?.at(0));
    if (selected !== sort) {
      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.set('sorting', selected);

      if (nextSearchParams.toString() !== searchParamsUrl) {
        setSearchParams(nextSearchParams);
      }
    }
  };

  return (
    <nav className="menu container" aria-label="Movie filters and sorting">
      <div className="menu__filters">
        <Link
          to={sort ? `?sorting=${sort}` : ``}
          className={`menu__link ${!filter ? 'menu__link--active' : ''}`}
          key="all"
        >
          all
        </Link>
        {genresFilter.map((genre) => (
          <Link
            to={sort ? `?filter=${genre}&sorting=${sort}` : `?filter=${genre}`}
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
          options={sortOptions}
          selectedOptions={[selectedOption]}
          onChange={handleSelectChange}
          styleName="menu__short__select"
          accessibleLabel="Sort movies"
        />
      </div>
    </nav>
  );
}

export default Filter;
