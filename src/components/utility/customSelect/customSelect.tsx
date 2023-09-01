import { useEffect, useRef, useState } from 'react';
import './customSelect.scss';

type CustomSelectProps = {
  options: string[];
  selectedOptions?: string[] | null;
  onChange?: (selectedOptions: string[] | null) => void;
  isMultiSelect?: boolean;
  placeholder?: string;
  styleName?: string;
  styleId?: string;
};

function CustomSelect({
  options,
  selectedOptions,
  onChange,
  isMultiSelect = false,
  placeholder,
  styleName,
  styleId,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const [internalSelectedOptions, setInternalSelectedOptions] = useState<
    string[] | null
  >(selectedOptions || null);

  const toggling = () => setIsOpen(!isOpen);

  const onOptionClicked = (value: string) => () => {
    if (isMultiSelect) {
      const isSelected = internalSelectedOptions?.includes(value);
      let newSelectedOptions: string[] | null;

      if (isSelected) {
        newSelectedOptions =
          internalSelectedOptions?.filter((option) => option !== value) || null;
      } else {
        newSelectedOptions = [...(internalSelectedOptions || []), value];
      }

      setInternalSelectedOptions(newSelectedOptions);
      onChange?.(newSelectedOptions || []);
    } else {
      const newSelectedOptions = [value];
      setInternalSelectedOptions(newSelectedOptions);
      onChange?.(newSelectedOptions);
      setIsOpen(false);
    }
  };

  const handleOutsideClick = (event: MouseEvent) => {
    if (
      selectRef.current &&
      !selectRef.current.contains(event.target as Node) &&
      selectRef.current &&
      !selectRef.current.contains(event.target as Node)
    ) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, []);

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
      <div
        className="custom-select__header"
        onClick={toggling}
        onKeyDown={toggling}
        role="button"
        tabIndex={0}
      >
        {internalSelectedOptions?.length
          ? internalSelectedOptions.join(', ')
          : placeholder}
      </div>
      {isOpen && (
        <div className="custom-select__container">
          <div className="custom-select">
            {options.map((option) => (
              <div
                key={option}
                onClick={onOptionClicked(option)}
                onKeyDown={onOptionClicked(option)}
                role="button"
                tabIndex={0}
                className={`custom-select__item${
                  internalSelectedOptions &&
                  internalSelectedOptions.includes(option)
                    ? ' custom-select__item--selected'
                    : ''
                }`}
              >
                {option}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomSelect;
