import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import ErrorModal from './errorModal';
import modalReducer from '../../../reducer/modalSlice'; // Update the path accordingly

const mockInitialState = {
  modal: {
    open: true,
    type: 'error',
    loading: false,
    error: 'Sample error message',
    movie: undefined,
    message: '',
  },
};

const mockStore = configureStore({
  reducer: {
    modal: modalReducer,
  },
  preloadedState: mockInitialState,
});

describe('<ErrorModal />', () => {
  it('should display the error message', () => {
    const { getByText } = render(
      <Provider store={mockStore}>
        <ErrorModal />
      </Provider>
    );

    expect(getByText('Sample error message')).toBeInTheDocument();
  });
});
