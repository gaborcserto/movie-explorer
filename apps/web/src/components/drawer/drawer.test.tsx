import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Drawer from './drawer';

afterEach(() => {
  cleanup();
  document.body.style.overflow = '';
});

test('renders drawer regions and controls its exit state', () => {
  const { rerender } = render(
    <>
      <button type="button">Trigger</button>
      <Drawer
        open
        title="Example drawer"
        onClose={vi.fn()}
        footer={<button type="button">Footer action</button>}
      >
        <p>Scrollable content</p>
      </Drawer>
    </>
  );

  expect(screen.getByRole('dialog', { name: 'Example drawer' })).toBeVisible();
  expect(screen.getByText('Scrollable content')).toBeVisible();
  expect(screen.getByRole('contentinfo')).toContainElement(
    screen.getByRole('button', { name: 'Footer action' })
  );

  rerender(
    <>
      <button type="button">Trigger</button>
      <Drawer open={false} title="Example drawer" onClose={vi.fn()}>
        <p>Scrollable content</p>
      </Drawer>
    </>
  );
  expect(screen.getByRole('dialog')).toHaveClass('drawer__panel');
  expect(screen.getByRole('dialog').parentElement).toHaveClass('is-closing');
});

test('dismisses through Escape and backdrop, traps focus, and restores page state', async () => {
  const onClose = vi.fn();
  const background = document.createElement('div');
  Object.defineProperty(background, 'inert', {
    configurable: true,
    writable: true,
    value: false,
  });
  document.body.append(background);
  const { unmount } = render(
    <>
      <button type="button">Trigger</button>
      <Drawer
        open
        title="Example drawer"
        onClose={onClose}
        footer={<button type="button">Last action</button>}
      >
        <button type="button">First action</button>
      </Drawer>
    </>
  );

  expect(document.body.style.overflow).toBe('hidden');
  expect(background.inert).toBe(true);
  expect(screen.getByRole('dialog')).toHaveFocus();
  await userEvent.tab({ shift: true });
  expect(screen.getByRole('button', { name: 'Last action' })).toHaveFocus();
  await userEvent.keyboard('{Escape}');
  expect(onClose).toHaveBeenCalledTimes(1);
  await userEvent.click(
    screen.getByRole('button', { name: 'Dismiss Example drawer' })
  );
  expect(onClose).toHaveBeenCalledTimes(2);

  unmount();
  expect(document.body.style.overflow).toBe('');
  expect(background.inert).toBe(false);
  background.remove();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
