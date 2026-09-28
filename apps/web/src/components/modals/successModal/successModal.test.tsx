import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import SuccessModal from './successModal';
import modalReducer from '../../../reducer/modalSlice'; // Update the path accordingly

const mockInitialState = {
  modal: {
    open: true,
    type: 'success',
    loading: false,
    error: '',
    movie: undefined,
    message: 'Success',
  },
};

const mockStore = configureStore({
  reducer: {
    modal: modalReducer,
  },
  preloadedState: mockInitialState,
});

describe('<SuccessModal />', () => {
  it('should display the error message', () => {
    const { getByText } = render(
      <Provider store={mockStore}>
        <SuccessModal />
      </Provider>
    );

    expect(getByText('Success')).toBeInTheDocument();
  });
});
