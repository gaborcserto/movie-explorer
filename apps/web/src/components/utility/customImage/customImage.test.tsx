import { act, fireEvent, render, screen } from '@testing-library/react';
import { useLayoutEffect, useRef } from 'react';
import MovieImage from './customImage';
import placeholderImage from '../../../assets/img/noimage.png';

function LoadImageDuringLayout() {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const image = containerRef.current?.querySelector('img');
    if (image) act(() => fireEvent.load(image));
  }, []);

  return (
    <div ref={containerRef}>
      <MovieImage
        src="/cached.jpg"
        alt="Cached poster"
        className="movie-image"
      />
    </div>
  );
}

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

  it('keeps a successful load that arrives before passive effects run', () => {
    render(<LoadImageDuringLayout />);
    expect(screen.getByAltText('Cached poster')).toHaveStyle({ opacity: '1' });
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

  it('ignores stale events and recovers across rapid source and sizes changes', () => {
    const { rerender } = render(
      <MovieImage src="/first.jpg" alt="Poster" className="movie-image" />
    );
    const oldImage = screen.getByAltText('Poster');
    fireEvent.error(oldImage);
    rerender(
      <MovieImage
        src="/next.jpg"
        sizes="200px"
        alt="Poster"
        className="movie-image"
      />
    );
    const nextImage = screen.getByAltText('Poster');
    expect(screen.getByAltText('Poster')).toHaveAttribute('src', '/next.jpg');
    expect(screen.getByAltText('Poster')).toHaveStyle({ opacity: '0' });
    rerender(
      <MovieImage
        src="/last.jpg"
        sizes="300px"
        alt="Poster"
        className="movie-image"
      />
    );
    const lastImage = screen.getByAltText('Poster');
    fireEvent.load(nextImage);
    expect(lastImage).toHaveStyle({ opacity: '0' });
    fireEvent.load(lastImage);
    expect(lastImage).toHaveStyle({ opacity: '1' });
    rerender(
      <MovieImage
        src="/last.jpg"
        srcSet="/last-large.jpg 2x"
        sizes="300px"
        alt="Poster"
        className="movie-image"
      />
    );
    const responsiveImage = screen.getByAltText('Poster');
    fireEvent.error(responsiveImage);
    expect(responsiveImage).toHaveAttribute('src', placeholderImage);
    fireEvent.error(oldImage);
    rerender(
      <MovieImage
        src="/recovered.jpg"
        srcSet="/recovered-large.jpg 2x"
        sizes="300px"
        alt="Poster"
        className="movie-image"
      />
    );
    const recoveredImage = screen.getByAltText('Poster');
    expect(recoveredImage).toHaveAttribute('src', '/recovered.jpg');
    expect(recoveredImage).toHaveStyle({ opacity: '0' });
    fireEvent.load(recoveredImage);
    expect(recoveredImage).toHaveStyle({ opacity: '1' });
    expect(recoveredImage).not.toHaveAttribute('src', placeholderImage);
    expect(screen.getByAltText('Poster')).toHaveAttribute(
      'srcset',
      '/recovered-large.jpg 2x'
    );
  });

  it('resets loaded state when a source changes away and back quickly', () => {
    const { rerender } = render(
      <MovieImage src="/first.jpg" alt="Poster" className="movie-image" />
    );
    const firstImage = screen.getByAltText('Poster');
    fireEvent.load(firstImage);
    expect(firstImage).toHaveStyle({ opacity: '1' });

    rerender(
      <MovieImage src="/temporary.jpg" alt="Poster" className="movie-image" />
    );
    expect(screen.getByAltText('Poster')).toHaveStyle({ opacity: '0' });
    rerender(
      <MovieImage src="/first.jpg" alt="Poster" className="movie-image" />
    );
    expect(screen.getByAltText('Poster')).toHaveStyle({ opacity: '0' });
  });
});
