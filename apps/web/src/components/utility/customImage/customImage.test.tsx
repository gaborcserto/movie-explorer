import { render, waitFor } from '@testing-library/react';
import MovieImage from './customImage';
import mockImage from '../../../assets/img/noimage.png';

describe('<MovieImage />', () => {
  it('renders the placeholder when no source is provided', () => {
    const placeholderImage = mockImage;
    const { getByAltText } = render(
      <MovieImage alt="Sample Image" className="movie-image" />
    );
    const imgElement = getByAltText('Sample Image');
    expect(imgElement).toBeInTheDocument();
    expect(imgElement).toHaveAttribute('src', placeholderImage);
  });

  it('loads and displays the provided source', async () => {
    const { getByAltText } = render(
      <MovieImage src={mockImage} alt="Sample Image" className="movie-image" />
    );

    const imgElement = getByAltText('Sample Image');

    await waitFor(() => expect(imgElement).toHaveAttribute('src', mockImage));
  });
});
