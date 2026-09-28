import { render, fireEvent, screen } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import moviesReducer from '../../reducer/moviesSlice';
import modalReducer from '../../reducer/modalSlice';
import Search from './search';

const mockStore = configureStore({
  reducer: {
    movies: moviesReducer,
    modal: modalReducer,
  },
});

describe('Search Component', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders Search component', () => {
    render(
      <Provider store={mockStore}>
        <Router>
          <Search />
        </Router>
      </Provider>
    );

    expect(
      screen.getByPlaceholderText('What do you want to watch?')
    ).toBeInTheDocument();
  });

  test('updates input value on change', () => {
    render(
      <Provider store={mockStore}>
        <Router>
          <Search />
        </Router>
      </Provider>
    );

    const input = screen.getByPlaceholderText(
      'What do you want to watch?'
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Inception' } });

    expect(input.value).toBe('Inception');
  });

  test('navigates to search results on form submission', () => {
    render(
      <Provider store={mockStore}>
        <Router>
          <Search />
        </Router>
      </Provider>
    );
    const input = screen.getByPlaceholderText('What do you want to watch?');
    fireEvent.change(input, { target: { value: 'Inception' } });
    fireEvent.submit(input);
  });

  test('opens modal on + Add movie button click', () => {
    render(
      <Provider store={mockStore}>
        <Router>
          <Search />
        </Router>
      </Provider>
    );

    const button = screen.getByText('+ Add movie');
    fireEvent.click(button);
  });
});
