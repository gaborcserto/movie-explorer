import { useEffect, useId, useRef, useState } from 'react';
import './customSelect.scss';

type CustomSelectProps = {
  options: string[];
  selectedOptions?: string[] | null;
  onChange?: (selectedOptions: string[] | null) => void;
  isMultiSelect?: boolean;
  placeholder?: string;
  styleName?: string;
  styleId?: string;
  accessibleLabel?: string;
};

function CustomSelect({
  options,
  selectedOptions,
  onChange,
  isMultiSelect = false,
  placeholder,
  styleName,
  styleId,
  accessibleLabel,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const optionsId = useId();
  const [internalSelectedOptions, setInternalSelectedOptions] = useState<
    string[] | null
  >(selectedOptions ?? null);

  const toggleOptions = () => setIsOpen((open) => !open);

  const onOptionClicked = (value: string) => () => {
    if (isMultiSelect) {
      const isSelected = internalSelectedOptions?.includes(value);
      const newSelectedOptions = isSelected
        ? (internalSelectedOptions?.filter((option) => option !== value) ?? [])
        : [...(internalSelectedOptions ?? []), value];

      setInternalSelectedOptions(newSelectedOptions);
      onChange?.(newSelectedOptions);
    } else {
      const newSelectedOptions = [value];
      setInternalSelectedOptions(newSelectedOptions);
      onChange?.(newSelectedOptions);
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleOutsideClick = (event: MouseEvent) => {
      if (
        event.target instanceof Node &&
        !selectRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    if (selectedOptions !== undefined) {
      setInternalSelectedOptions(selectedOptions);
    }
  }, [selectedOptions]);

  return (
    <div
      ref={selectRef}
      id={styleId}
      className={`custom-select__wrapper${
        isMultiSelect ? ' custom-select--multiselect' : ''
      }
      ${styleName ? ` ${styleName}` : ''}
      ${isOpen ? ' custom-select__wrapper--open' : ''}`}
    >
      <button
        type="button"
        className="custom-select__header"
        onClick={toggleOptions}
        aria-label={accessibleLabel}
        aria-expanded={isOpen}
        aria-controls={optionsId}
      >
        {internalSelectedOptions?.length
          ? internalSelectedOptions.join(', ')
          : placeholder}
      </button>
      {isOpen && (
        <div className="custom-select__container">
          <ul className="custom-select" id={optionsId}>
            {options.map((option) => (
              <li key={option}>
                <button
                  type="button"
                  onClick={onOptionClicked(option)}
                  aria-pressed={Boolean(
                    internalSelectedOptions?.includes(option)
                  )}
                  className={`custom-select__item${
                    internalSelectedOptions?.includes(option)
                      ? ' custom-select__item--selected'
                      : ''
                  }`}
                >
                  {option}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default CustomSelect;
