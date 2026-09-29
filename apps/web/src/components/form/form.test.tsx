import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FormEvent } from 'react';
import Form from './form';

describe('<Form />', () => {
  it('renders reusable form content and submits it', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
    });

    render(
      <Form title="Advanced filters" onSubmit={onSubmit}>
        <label htmlFor="keywords">
          Keywords
          <input id="keywords" name="keywords" />
        </label>
      </Form>
    );

    expect(screen.getByLabelText('Keywords')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('renders an optional reset action', async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();

    render(
      <Form title="Filters" onSubmit={vi.fn()} onReset={onReset}>
        <div>Fields</div>
      </Form>
    );

    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
