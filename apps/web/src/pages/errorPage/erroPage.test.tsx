import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ErrorPage from './errorPage';

describe('ErrorPage component', () => {
  it('renders without crashing', () => {
    const { getByText } = render(
      <MemoryRouter>
        <ErrorPage />
      </MemoryRouter>
    );

    const errorTitle = getByText('404 Error');
    expect(errorTitle).toBeInTheDocument();

    const errorSubtitle = getByText('Not Found');
    expect(errorSubtitle).toBeInTheDocument();
  });
});
