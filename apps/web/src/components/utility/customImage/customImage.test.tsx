import { fireEvent, render, screen } from '@testing-library/react';
import MovieImage from './customImage';
import placeholderImage from '../../../assets/img/noimage.png';

describe('<MovieImage />', () => {
  it('renders the placeholder when no source is provided', () => {
    render(<MovieImage alt="Poster" className="movie-image" />);
    expect(screen.getByAltText('Poster')).toHaveAttribute(
      'src',
      placeholderImage
    );
  });

  it('loads directly with native lazy loading and a loading placeholder', () => {
    const imageConstructor = vi.spyOn(window, 'Image');
    render(
      <MovieImage src="/poster.jpg" alt="Poster" className="movie-image" />
    );
    const image = screen.getByAltText('Poster');
    expect(image).toHaveAttribute('src', '/poster.jpg');
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image).toHaveAttribute('decoding', 'async');
    expect(imageConstructor).not.toHaveBeenCalled();
    expect(image.parentElement).toHaveStyle({
      backgroundImage: `url(${placeholderImage})`,
    });
    fireEvent.load(image);
    expect(image).toHaveStyle({ opacity: '1' });
    expect(image.parentElement?.style.backgroundImage).toBe('');
    imageConstructor.mockRestore();
  });

  it('supports explicit eager loading and responsive candidates', () => {
    render(
      <MovieImage
        src="/poster.jpg"
        srcSet="/small.jpg 300w, /large.jpg 780w"
        sizes="300px"
        loading="eager"
        alt="Poster"
        className="movie-image"
      />
    );
    const image = screen.getByAltText('Poster');
    expect(image).toHaveAttribute('loading', 'eager');
    expect(image).toHaveAttribute('srcset', '/small.jpg 300w, /large.jpg 780w');
    expect(image).toHaveAttribute('sizes', '300px');
  });

  it('clears candidates on failure and does not retry a broken fallback', () => {
    render(
      <MovieImage
        src="/broken.jpg"
        srcSet="/broken-large.jpg 2x"
        sizes="300px"
        alt="Poster"
        className="movie-image"
      />
    );
    const image = screen.getByAltText('Poster');
    fireEvent.error(image);
    expect(image).toHaveAttribute('src', placeholderImage);
    expect(image).not.toHaveAttribute('srcset');
    expect(image).not.toHaveAttribute('sizes');
    fireEvent.error(image);
    expect(image).toHaveAttribute('src', placeholderImage);
  });

  it('resets loading and errors when sources or candidates change', () => {
    const { rerender } = render(
      <MovieImage src="/first.jpg" alt="Poster" className="movie-image" />
    );
    const oldImage = screen.getByAltText('Poster');
    fireEvent.error(oldImage);
    rerender(
      <MovieImage src="/next.jpg" alt="Poster" className="movie-image" />
    );
    expect(screen.getByAltText('Poster')).toHaveAttribute('src', '/next.jpg');
    expect(screen.getByAltText('Poster')).toHaveStyle({ opacity: '0' });
    fireEvent.load(screen.getByAltText('Poster'));
    rerender(
      <MovieImage
        src="/next.jpg"
        srcSet="/next-large.jpg 2x"
        alt="Poster"
        className="movie-image"
      />
    );
    fireEvent.error(oldImage);
    expect(screen.getByAltText('Poster')).toHaveAttribute('src', '/next.jpg');
    expect(screen.getByAltText('Poster')).toHaveAttribute(
      'srcset',
      '/next-large.jpg 2x'
    );
  });
});
