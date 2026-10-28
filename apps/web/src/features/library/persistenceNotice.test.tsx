import { render, screen } from '@testing-library/react';

import PersistenceNotice from './persistenceNotice';
import { useLibraryStore } from './libraryStore';

it('announces when Personal Library changes may not survive a reload', () => {
  useLibraryStore.setState({
    persistenceWarning: 'Personal Library changes may not survive a reload.',
  });

  const { unmount } = render(<PersistenceNotice />);

  expect(screen.getByRole('status')).toHaveTextContent(
    'Personal Library changes may not survive a reload.'
  );

  unmount();
  useLibraryStore.setState({ persistenceWarning: null });
});
