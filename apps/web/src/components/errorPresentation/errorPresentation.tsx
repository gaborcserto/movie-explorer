import type { ReactNode } from 'react';

import PopcornIllustration from './popcornIllustration';
import './errorPresentation.scss';

interface Props {
  status?: string;
  heading: string;
  description: string;
  primaryAction: ReactNode;
  secondaryAction?: ReactNode;
  illustration?: ReactNode;
  headingLevel?: 1 | 2;
  variant?: 'page' | 'contextual';
}

function ErrorPresentation({
  status,
  heading,
  description,
  primaryAction,
  secondaryAction,
  illustration = <PopcornIllustration />,
  headingLevel = 2,
  variant = 'contextual',
}: Props) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2';

  return (
    <div className={`error-presentation error-presentation--${variant}`}>
      <div className="error-presentation__illustration" aria-hidden="true">
        {illustration}
      </div>
      {status && <p className="error-presentation__status">{status}</p>}
      <Heading className="error-presentation__heading">{heading}</Heading>
      <p className="error-presentation__description">{description}</p>
      <div className="error-presentation__actions">
        {primaryAction}
        {secondaryAction}
      </div>
    </div>
  );
}

export default ErrorPresentation;
