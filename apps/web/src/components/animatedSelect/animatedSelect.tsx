import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import './animatedSelect.scss';

export interface AnimatedSelectOption {
  value: string;
  label: string;
}

export interface AnimatedSelectProps {
  label: string;
  options: readonly AnimatedSelectOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

type Placement = 'bottom' | 'top';

interface Position {
  left: number;
  top?: number;
  bottom?: number;
  width: number;
  maxHeight: number;
  placement: Placement;
}

export default function AnimatedSelect({
  label,
  options,
  value,
  onChange,
  className,
}: AnimatedSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value)
  );
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const [position, setPosition] = useState<Position | null>(null);
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const activeOptionId = `${id}-option-${activeIndex}`;

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const updatePlacement = () => {
      const trigger = triggerRef.current;

      if (!trigger) {
        return;
      }

      const bounds = trigger.getBoundingClientRect();
      const preferredHeight = Math.min(window.innerHeight * 0.4, 320);
      const dropdownHeight = Math.min(
        preferredHeight,
        listboxRef.current?.scrollHeight || preferredHeight
      );
      const spaceAbove = bounds.top - 8;
      const spaceBelow = window.innerHeight - bounds.bottom - 8;
      const nextPlacement: Placement =
        spaceBelow < dropdownHeight && spaceAbove >= dropdownHeight
          ? 'top'
          : 'bottom';
      const width = Math.min(bounds.width, window.innerWidth - 16);
      const left = Math.max(
        8,
        Math.min(bounds.left, window.innerWidth - width - 8)
      );

      setPosition({
        left,
        top: nextPlacement === 'bottom' ? bounds.bottom + 8 : undefined,
        bottom:
          nextPlacement === 'top'
            ? window.innerHeight - bounds.top + 8
            : undefined,
        width,
        maxHeight: Math.max(
          0,
          Math.min(
            preferredHeight,
            nextPlacement === 'top' ? spaceAbove : spaceBelow
          )
        ),
        placement: nextPlacement,
      });
    };

    const closeOnOutsidePointer = (event: globalThis.PointerEvent) => {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target) &&
        !listboxRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    updatePlacement();
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('scroll', updatePlacement, true);
    window.addEventListener('resize', updatePlacement);

    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('scroll', updatePlacement, true);
      window.removeEventListener('resize', updatePlacement);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    listboxRef.current
      ?.querySelectorAll<HTMLElement>('[role="option"]')
      [activeIndex]?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex, open]);

  const openAt = (index: number) => {
    setActiveIndex(index);
    setPosition(null);
    setOpen(true);
  };

  const close = (restoreFocus = false) => {
    setOpen(false);

    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  };

  const selectIndex = (index: number) => {
    const option = options[index];

    if (!option) {
      return;
    }

    onChange(option.value);
    close(true);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (options.length === 0) {
      return;
    }

    if (event.key === 'Escape' && open) {
      event.preventDefault();
      close(true);

      return;
    }

    if (event.key === 'Tab') {
      close();

      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      const startIndex = open ? activeIndex : selectedIndex;
      const nextIndex =
        (startIndex + direction + options.length) % options.length;
      openAt(nextIndex);

      return;
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      openAt(event.key === 'Home' ? 0 : options.length - 1);

      return;
    }

    if (
      event.key === 'Enter' ||
      event.key === ' ' ||
      event.key === 'Spacebar'
    ) {
      event.preventDefault();

      if (open) {
        selectIndex(activeIndex);
      } else {
        openAt(selectedIndex);
      }
    }
  };

  const handleOptionPointerMove = (
    event: PointerEvent<HTMLDivElement>,
    index: number
  ) => {
    if (event.pointerType !== 'touch') {
      setActiveIndex(index);
    }
  };

  const handleOptionKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    index: number
  ) => {
    if (
      event.key === 'Enter' ||
      event.key === ' ' ||
      event.key === 'Spacebar'
    ) {
      event.preventDefault();
      selectIndex(index);
    }
  };

  return (
    <div
      ref={rootRef}
      className={`animated-select${className ? ` ${className}` : ''}`}
    >
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        className="animated-select__trigger"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-activedescendant={open ? activeOptionId : undefined}
        data-value={value}
        onClick={() => (open ? close() : openAt(selectedIndex))}
        onKeyDown={handleKeyDown}
      >
        <span>
          {options.find((option) => option.value === value)?.label ?? ''}
        </span>
        <span className="animated-select__chevron" aria-hidden="true" />
      </button>
      {createPortal(
        <div
          ref={listboxRef}
          id={`${id}-listbox`}
          className="animated-select__options"
          role="listbox"
          aria-label={label}
          aria-hidden={!open}
          inert={!open}
          data-open={open && position !== null}
          data-placement={position?.placement ?? 'bottom'}
          style={
            position
              ? {
                  left: position.left,
                  top: position.top,
                  bottom: position.bottom,
                  width: position.width,
                  maxHeight: position.maxHeight,
                }
              : undefined
          }
        >
          {options.map((option, index) => (
            <div
              id={`${id}-option-${index}`}
              key={option.value}
              className="animated-select__option"
              role="option"
              tabIndex={-1}
              aria-selected={option.value === value}
              data-active={index === activeIndex}
              data-value={option.value}
              onPointerMove={(event) => handleOptionPointerMove(event, index)}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => selectIndex(index)}
              onKeyDown={(event) => handleOptionKeyDown(event, index)}
            >
              {option.label}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
