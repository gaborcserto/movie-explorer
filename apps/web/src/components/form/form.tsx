import './form.scss';
import { Controller, useForm } from 'react-hook-form';
import type { MovieMutationPayload } from '@movie-explorer/contracts';
import CustomSelect from '../utility/customSelect';
import { genreTypes, urlPattern } from '../../data';

interface MovieFormProps {
  onSubmit: (data: MovieMutationPayload) => void;
  title: string;
  movieData?: MovieMutationPayload;
}

function Form({ onSubmit, title, movieData }: MovieFormProps) {
  const {
    handleSubmit,
    control,
    register,
    reset,
    formState: { errors },
  } = useForm<MovieMutationPayload>({
    defaultValues: movieData ?? { genres: [] },
  });

  const handleReset = () => {
    reset();
  };

  return (
    <form onSubmit={handleSubmit((data) => onSubmit(data))} autoComplete="off">
      <h2 className="modal__header" id="modal-title">
        {title}
      </h2>
      <div className="modal__content">
        {movieData ? (
          <input
            type="hidden"
            id="id"
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
                {...register('title', { required: true })}
              />
            </label>
            {errors.title && <span role="alert">Movie title is required</span>}
          </div>
          <div className="modal__row__part2">
            <label htmlFor="releaseDate" className="modal__label">
              Release Date
              <input
                id="releaseDate"
                className="modal__input"
                placeholder="Release Date"
                type="date"
                aria-invalid={errors.releaseDate ? 'true' : 'false'}
                {...register('releaseDate', { required: true })}
              />
            </label>
            {errors.releaseDate && (
              <span role="alert">Release Date is required</span>
            )}
          </div>
        </div>
        <div className="modal__row">
          <div className="modal__row__part1">
            <label className="modal__label" htmlFor="posterUrl">
              Movie url
              <input
                id="posterUrl"
                className="modal__input"
                placeholder="Movie url"
                type="text"
                autoComplete="off"
                aria-invalid={errors.posterUrl ? 'true' : 'false'}
                {...register('posterUrl', {
                  required: 'Movie url is required',
                  pattern: {
                    value: urlPattern,
                    message: 'Please enter a valid URL',
                  },
                })}
              />
            </label>
            {errors.posterUrl && (
              <span role="alert">{errors.posterUrl.message}</span>
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
                aria-invalid={errors.rating ? 'true' : 'false'}
                {...register('rating', {
                  required: true,
                  valueAsNumber: true,
                })}
              />
              {errors.rating && (
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
                aria-invalid={errors.genres ? 'true' : 'false'}
                rules={{ required: 'Genre is required' }}
                render={({ field }) => (
                  <CustomSelect
                    options={genreTypes}
                    placeholder="Select Genre"
                    selectedOptions={field.value}
                    onChange={(selectedOptions) => {
                      if (selectedOptions !== null) {
                        field.onChange(selectedOptions);
                      }
                    }}
                    isMultiSelect
                    styleName="modal__input modal__input--select"
                    styleId="genre"
                    accessibleLabel="Select genres"
                  />
                )}
              />
            </div>
            {errors.genres && <span role="alert">{errors.genres.message}</span>}
          </div>
          <div className="modal__row__part2">
            <label className="modal__label" htmlFor="runtimeMinutes">
              Runtime
              <input
                id="runtimeMinutes"
                className="modal__input"
                placeholder="Movie runtime"
                type="number"
                aria-invalid={errors.runtimeMinutes ? 'true' : 'false'}
                {...register('runtimeMinutes', {
                  required: true,
                  valueAsNumber: true,
                })}
              />
            </label>
            {errors.runtimeMinutes && (
              <span role="alert">Movie runtime is required</span>
            )}
          </div>
        </div>
        <label className="modal__label" htmlFor="description">
          Overview
          <textarea
            id="description"
            className="modal__input modal__input--textarea"
            placeholder="Movie description"
            aria-invalid={errors.description ? 'true' : 'false'}
            {...register('description', {
              required: true,
              minLength: 5,
            })}
          />
        </label>
        {errors.description && (
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
