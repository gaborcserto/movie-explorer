import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

import AnimatedSelect from '.';

const options = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'title', label: 'Title A–Z' },
];

function setViewportHeight(height: number) {
  const originalDescriptor = Object.getOwnPropertyDescriptor(
    window,
    'innerHeight'
  );

  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: height,
  });

  return () => {
    if (originalDescriptor) {
      Object.defineProperty(window, 'innerHeight', originalDescriptor);
    } else {
      Reflect.deleteProperty(window, 'innerHeight');
    }
  };
}

function setViewportWidth(width: number) {
  const originalDescriptor = Object.getOwnPropertyDescriptor(
    window,
    'innerWidth'
  );

  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: width,
  });

  return () => {
    if (originalDescriptor) {
      Object.defineProperty(window, 'innerWidth', originalDescriptor);
    } else {
      Reflect.deleteProperty(window, 'innerWidth');
    }
  };
}

function ControlledSelect() {
  const [value, setValue] = useState('newest');

  return (
    <div>
      <span>Sort filmography</span>
      <AnimatedSelect
        label="Sort filmography"
        options={options}
        value={value}
        onChange={setValue}
      />
    </div>
  );
}

describe('<AnimatedSelect />', () => {
  it('opens from the trigger and commits pointer selections without losing focus', async () => {
    const user = userEvent.setup();
    render(<ControlledSelect />);

    const trigger = screen.getByRole('combobox', { name: 'Sort filmography' });
    await user.click(trigger);

    const listbox = screen.getByRole('listbox', { name: 'Sort filmography' });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(listbox).toBeVisible();
    expect(listbox).toHaveAttribute('data-placement', 'bottom');
    expect(
      screen.getByRole('option', { name: 'Newest first' })
    ).toHaveAttribute('aria-selected', 'true');

    await user.click(screen.getByRole('option', { name: 'Title A–Z' }));

    expect(trigger).toHaveAttribute('data-value', 'title');
    expect(trigger).toHaveTextContent('Title A–Z');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });

  it('supports arrow, Home, End, Enter, Space and Escape keyboard controls', async () => {
    const user = userEvent.setup();
    render(<ControlledSelect />);

    const trigger = screen.getByRole('combobox', { name: 'Sort filmography' });
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'Oldest first' }).id
    );
    await user.keyboard('{Enter}');
    expect(trigger).toHaveAttribute('data-value', 'oldest');
    expect(trigger).toHaveFocus();

    await user.keyboard('{End}');
    expect(trigger).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'Title A–Z' }).id
    );
    await user.keyboard(' ');
    expect(trigger).toHaveAttribute('data-value', 'title');

    await user.keyboard('{Home}');
    expect(trigger).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'Newest first' }).id
    );
    await user.keyboard('{Escape}');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });

  it('closes on outside pointer interaction and chooses the side with room', async () => {
    const user = userEvent.setup();
    render(
      <>
        <ControlledSelect />
        <button type="button">Outside</button>
      </>
    );

    const trigger = screen.getByRole('combobox', { name: 'Sort filmography' });
    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({
      top: 800,
      bottom: 844,
      left: 0,
      right: 200,
      width: 200,
      height: 44,
      x: 0,
      y: 800,
      toJSON: () => ({}),
    });
    const restoreViewport = setViewportHeight(900);

    try {
      await user.click(trigger);
      expect(screen.getByRole('listbox')).toHaveAttribute(
        'data-placement',
        'top'
      );
      const listbox = screen.getByRole('listbox');
      expect(listbox.style.bottom).toBe('108px');
      expect(listbox.style.left).toBe('8px');
      expect(listbox.style.width).toBe('200px');
      await user.click(screen.getByRole('button', { name: 'Outside' }));
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    } finally {
      restoreViewport();
    }
  });

  it('closes with Tab without preventing normal focus movement', () => {
    render(
      <>
        <ControlledSelect />
        <button type="button">Next control</button>
      </>
    );

    const trigger = screen.getByRole('combobox', { name: 'Sort filmography' });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'Tab' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps the menu opening downward when neither side has enough room', async () => {
    const user = userEvent.setup();
    render(<ControlledSelect />);

    const trigger = screen.getByRole('combobox', { name: 'Sort filmography' });
    const listbox = document.querySelector<HTMLDivElement>(
      '.animated-select__options'
    );

    if (!listbox) {
      throw new Error('The select listbox was not rendered.');
    }

    Object.defineProperty(listbox, 'scrollHeight', {
      configurable: true,
      value: 120,
    });
    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({
      top: 86,
      bottom: 130,
      left: 40,
      right: 240,
      width: 200,
      height: 44,
      x: 40,
      y: 86,
      toJSON: () => ({}),
    });
    const restoreViewport = setViewportHeight(200);

    try {
      await user.click(trigger);

      expect(listbox).toHaveAttribute('data-placement', 'bottom');
      expect(listbox.style.top).toBe('138px');
      expect(listbox.style.maxHeight).toBe('62px');
    } finally {
      restoreViewport();
    }
  });

  it('keeps the dropdown aligned within a narrow mobile viewport', async () => {
    const user = userEvent.setup();
    render(<ControlledSelect />);

    const trigger = screen.getByRole('combobox', { name: 'Sort filmography' });
    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({
      top: 60,
      bottom: 104,
      left: 20,
      right: 300,
      width: 280,
      height: 44,
      x: 20,
      y: 60,
      toJSON: () => ({}),
    });
    const restoreWidth = setViewportWidth(320);
    const restoreHeight = setViewportHeight(700);

    try {
      await user.click(trigger);

      const listbox = screen.getByRole('listbox');
      expect(listbox).toHaveAttribute('data-placement', 'bottom');
      expect(listbox.style.left).toBe('20px');
      expect(listbox.style.width).toBe('280px');
    } finally {
      restoreWidth();
      restoreHeight();
    }
  });
});
