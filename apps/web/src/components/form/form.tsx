import './form.scss';
import type { FormEventHandler, ReactNode } from 'react';

interface FormProps {
  children: ReactNode;
  onReset?: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  submitLabel?: string;
  title: string;
}

function Form({
  children,
  onReset,
  onSubmit,
  submitLabel = 'Apply',
  title,
}: FormProps) {
  return (
    <form onSubmit={onSubmit} autoComplete="off">
      <h2 className="modal__header" id="modal-title">
        {title}
      </h2>
      <div className="modal__content">{children}</div>
      <div className="modal__footer">
        {onReset && (
          <button type="button" className="btn btn--outline" onClick={onReset}>
            Reset
          </button>
        )}
        <button className="btn btn--primary" type="submit">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

export default Form;
