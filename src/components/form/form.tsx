import { useEffect } from 'react';
import './form.scss';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import CustomSelect from '../utility/customSelect';
import { MovieData } from '../../types';
import { genreTypes, urlPattern } from '../../data';

interface ComponentProps {
  handleClick: (data: MovieData) => void;
  title: string;
  movieData?: MovieData;
}

function Form({ handleClick, title, movieData }: ComponentProps) {
  const {
    handleSubmit,
    control,
    register,
    setValue,
    reset,
    formState: { errors },
  } = useForm<MovieData>();

  const handleReset = () => {
    reset();
  };

  const onSubmit: SubmitHandler<MovieData> = (data) => {
    handleClick(data);
  };

  useEffect(() => {
    if (movieData) {
      setValue('title', movieData.title);
      setValue('release_date', movieData.release_date);
      setValue('poster_path', movieData.poster_path);
      setValue('vote_average', movieData.vote_average);
      setValue('genres', movieData.genres);
      setValue('runtime', movieData.runtime);
      setValue('overview', movieData.overview);
    }
  }, [movieData, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
      <div className="modal__header">{title}</div>
      <div className="modal__content">
        {movieData ? (
          <input
            type="hidden"
            id="id"
            value={movieData.id}
            {...register('id', { required: true, valueAsNumber: true })}
          />
        ) : null}
        <div className="modal__row">
          <div className="modal__row__part1">
            <label htmlFor="title" className="modal__label">
              Title
              <input
                id="title"
                className="modal__input"
                placeholder="Movie title"
                type="text"
                autoComplete="off"
                aria-invalid={errors.title ? 'true' : 'false'}
                defaultValue={movieData ? movieData.title : ''}
                {...register('title', { required: true })}
              />
            </label>
            {errors.title && <span role="alert">Movie title is required</span>}
          </div>
          <div className="modal__row__part2">
            <label htmlFor="release_date" className="modal__label">
              Release Date
              <input
                id="release_date"
                className="modal__input"
                placeholder="Release Date"
                type="date"
                aria-invalid={errors.release_date ? 'true' : 'false'}
                defaultValue={movieData ? movieData.release_date : ''}
                {...register('release_date', { required: true })}
              />
            </label>
            {errors.release_date && (
              <span role="alert">Release Date is required</span>
            )}
          </div>
        </div>
        <div className="modal__row">
          <div className="modal__row__part1">
            <label className="modal__label" htmlFor="poster_path">
              Movie url
              <input
                id="poster_path"
                className="modal__input"
                placeholder="Movie url"
                type="text"
                autoComplete="off"
                aria-invalid={errors.poster_path ? 'true' : 'false'}
                defaultValue={movieData ? movieData.poster_path : ''}
                {...register('poster_path', {
                  required: 'Movie url is required',
                  pattern: {
                    value: urlPattern,
                    message: 'Please enter a valid URL',
                  },
                })}
              />
            </label>
            {errors.poster_path && (
              <span role="alert">{errors.poster_path.message}</span>
            )}
          </div>
          <div className="modal__row__part2">
            <label className="modal__label" htmlFor="rating">
              Rating
              <input
                id="rating"
                className="modal__input"
                placeholder="Movie rating"
                type="number"
                step="0.1"
                min="0"
                max="10"
                autoComplete="off"
                aria-invalid={errors.vote_average ? 'true' : 'false'}
                defaultValue={movieData ? movieData.vote_average : ''}
                {...register('vote_average', {
                  required: true,
                  valueAsNumber: true,
                })}
              />
              {errors.vote_average && (
                <span role="alert">Movie rating is required</span>
              )}
            </label>
          </div>
        </div>
        <div className="modal__row">
          <div className="modal__row__part1">
            <div className="modal__label">
              Genre
              <Controller
                name="genres"
                control={control}
                defaultValue={movieData ? movieData.genres : []}
                aria-invalid={errors.genres ? 'true' : 'false'}
                rules={{ required: 'Genre is required' }}
                render={({ field }) => (
                  <CustomSelect
                    options={genreTypes}
                    placeholder="Select Genre"
                    selectedOptions={movieData?.genres}
                    onChange={(selectedOptions) => {
                      if (selectedOptions !== null) {
                        field.onChange(selectedOptions);
                      }
                    }}
                    isMultiSelect
                    styleName="modal__input modal__input--select"
                    styleId="genre"
                  />
                )}
              />
            </div>
            {errors.genres && <span role="alert">{errors.genres.message}</span>}
          </div>
          <div className="modal__row__part2">
            <label className="modal__label" htmlFor="runtime">
              Runtime
              <input
                id="runtime"
                className="modal__input"
                placeholder="Movie runtime"
                type="number"
                defaultValue={movieData ? movieData.runtime : ''}
                aria-invalid={errors.runtime ? 'true' : 'false'}
                {...register('runtime', {
                  required: true,
                  valueAsNumber: true,
                })}
              />
            </label>
            {errors.runtime && (
              <span role="alert">Movie runtime is required</span>
            )}
          </div>
        </div>
        <label className="modal__label" htmlFor="overview">
          Overview
          <textarea
            id="overview"
            className="modal__input modal__input--textarea"
            placeholder="Movie description"
            defaultValue={movieData ? movieData.overview : ''}
            aria-invalid={errors.overview ? 'true' : 'false'}
            {...register('overview', {
              required: true,
              minLength: 5,
            })}
          />
        </label>
        {errors.overview && (
          <span role="alert">Movie description is required</span>
        )}
      </div>
      <div className="modal__footer">
        <button
          type="button"
          className="btn btn--outline"
          onClick={handleReset}
        >
          Reset
        </button>
        <button className="btn btn--primary" type="submit">
          Submit
        </button>
      </div>
    </form>
  );
}

export default Form;
