import { render, fireEvent, screen } from '@testing-library/react';
import CustomSelect from './customSelect';

describe('CustomSelect', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders placeholder when no option is selected', () => {
    const placeholderText = 'Select an option';

    render(
      <CustomSelect
        options={['Option 1', 'Option 2']}
        placeholder={placeholderText}
      />
    );

    expect(screen.getByText(placeholderText)).toBeInTheDocument();
  });

  it('selects an option when clicked', () => {
    const mockOnChange = vi.fn();

    render(
      <CustomSelect
        options={['Option 1', 'Option 2']}
        onChange={mockOnChange}
      />
    );

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByText('Option 1')).toBeVisible();

    fireEvent.click(screen.getByText('Option 1'));

    expect(mockOnChange).toHaveBeenCalledWith(['Option 1']);
  });

  it('toggles the dropdown when the header is clicked', () => {
    render(<CustomSelect options={['Option 1', 'Option 2']} />);

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByText('Option 1')).toBeVisible();
    expect(screen.getByText('Option 2')).toBeVisible();
  });

  it('closes the dropdown with Escape', () => {
    render(<CustomSelect options={['Option 1', 'Option 2']} />);

    fireEvent.click(screen.getByRole('button'));
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByText('Option 1')).not.toBeInTheDocument();
  });

  it('selects multiple options in multiselect mode', () => {
    const mockOnChange = vi.fn();

    render(
      <CustomSelect
        options={['Option 1', 'Option 2']}
        isMultiSelect
        onChange={mockOnChange}
      />
    );

    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('Option 1'));
    expect(mockOnChange).toHaveBeenCalledWith(['Option 1']);

    fireEvent.click(screen.getByText('Option 2'));
    expect(mockOnChange).toHaveBeenCalledWith(['Option 1', 'Option 2']);
  });
});
