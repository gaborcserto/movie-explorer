import { useEffect, useState } from 'react';
import './filter.scss';
import { useSearchParams, Link } from 'react-router-dom';
import CustomSelect from '../utility/customSelect';
import { sortOptions, genresFilter } from '../../data';
import { sortParams } from '../../util/apiUtils';

function Filter() {
  const [selectedOption, setSelectedOption] = useState<string>('title');
  const [searchParams, setSearchParams] = useSearchParams();

  const filter = searchParams.get('filter');
  const sort = searchParams.get('sorting');
  const searchParamsUrl = searchParams.toString();

  const replacer = (text: string) => {
    return text.replace(/_/g, ' ');
  };

  const handleSelectChange = (selectedOptions: string[] | null) => {
    const selected = sortParams(selectedOptions?.at(0));
    if (selected !== sort) {
      searchParams.set('sorting', selected);
      const newSearchParams = searchParams.toString();
      if (newSearchParams !== searchParamsUrl) {
        setSearchParams(searchParams);
      }
    }
    setSelectedOption(replacer(selected));
  };

  useEffect(() => {
    if (sort) {
      setSelectedOption(replacer(sort));
    } else if (!sort) {
      setSelectedOption('title');
    }
  }, [sort]);

  return (
    <nav className="menu container">
      <div className="menu__filters">
        <Link
          to={sort ? `?sorting=${sort}` : ``}
          type="button"
          className={`menu__link ${!filter ? 'menu__link--active' : ''}`}
          key="all"
        >
          all
        </Link>
        {genresFilter.map((genre) => (
          <Link
            to={sort ? `?filter=${genre}&sorting=${sort}` : `?filter=${genre}`}
            type="button"
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
        <p className="menu__short__label">short by</p>
        <CustomSelect
          options={sortOptions}
          selectedOptions={[selectedOption]}
          onChange={handleSelectChange}
          styleName="menu__short__select"
        />
      </div>
    </nav>
  );
}

export default Filter;
