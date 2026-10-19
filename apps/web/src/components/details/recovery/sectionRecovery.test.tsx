import { act, fireEvent, render, screen } from '@testing-library/react';
import SectionRecovery from './sectionRecovery';
import { ApiRequestError } from '../../../util/apiUtils';

afterEach(() => vi.useRealTimers());

test('honors safe rate-limit delays and remains manually recoverable', async () => {
  vi.useFakeTimers();
  const recover = vi
    .fn()
    .mockRejectedValueOnce(new ApiRequestError('rate-limited', 429, 2))
    .mockResolvedValue(undefined);
  render(
    <SectionRecovery
      label="Photos"
      availability={{ status: 'unavailable' }}
      recover={recover}
    />
  );
  await act(async () => fireEvent.click(screen.getByRole('button')));
  const retry = screen.getByRole('button');
  expect(retry).toHaveTextContent('Retry photos in 2s');
  fireEvent.click(retry);
  expect(recover).toHaveBeenCalledTimes(1);
  await act(async () => vi.advanceTimersByTimeAsync(1000));
  await act(async () => vi.advanceTimersByTimeAsync(1000));
  await act(async () => fireEvent.click(retry));
  expect(recover).toHaveBeenCalledTimes(2);
  vi.useRealTimers();
});

test('intentional cancellation stays silent and unmount aborts pending recovery', async () => {
  const recover = vi
    .fn()
    .mockRejectedValueOnce(new ApiRequestError('cancelled'));
  const view = render(
    <SectionRecovery
      label="Videos"
      availability={{ status: 'unavailable' }}
      recover={recover}
    />
  );
  await act(async () => fireEvent.click(screen.getByRole('button')));
  expect(screen.getByRole('status')).toHaveTextContent('Videos unavailable.');
  expect(screen.queryByText(/Please try again/)).not.toBeInTheDocument();
  recover.mockImplementation(() => new Promise(() => {}));
  fireEvent.click(screen.getByRole('button'));
  const signal = recover.mock.calls[1][0] as AbortSignal;
  view.unmount();
  expect(signal.aborted).toBe(true);
});

test('successful recovery does not steal focus after the user moves elsewhere', async () => {
  let resolve!: () => void;
  const recover = vi.fn(
    () =>
      new Promise<void>((done) => {
        resolve = done;
      })
  );
  render(
    <>
      <SectionRecovery
        label="Credits"
        availability={{ status: 'unavailable' }}
        recover={recover}
      />
      <button type="button">Other action</button>
    </>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Retry credits' }));
  screen.getByRole('button', { name: 'Other action' }).focus();
  await act(async () => resolve());
  expect(screen.getByRole('button', { name: 'Other action' })).toHaveFocus();
});
