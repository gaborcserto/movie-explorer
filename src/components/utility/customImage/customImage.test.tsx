import { render, waitFor } from '@testing-library/react';
import CustomImage from './customImage';
import mockImage from '../../../assets/img/noimage.png';

describe('<CustomImage />', () => {
  it('renders placeholder image if no img_path is provided', () => {
    const placeholderImage = mockImage;
    const { getByAltText } = render(<CustomImage img_title="Sample Image" />);
    const imgElement = getByAltText('Sample Image');
    expect(imgElement).toBeInTheDocument();
    expect(imgElement).toHaveAttribute('src', placeholderImage);
  });

  it('loads and displays image from img_path', async () => {
    const { getByAltText } = render(
      <CustomImage img_path={mockImage} img_title="Sample Image" />
    );

    const imgElement = getByAltText('Sample Image');

    await waitFor(() => expect(imgElement).toHaveAttribute('src', mockImage));
  });
});
