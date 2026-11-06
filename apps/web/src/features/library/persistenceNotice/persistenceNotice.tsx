import { useTranslation } from 'react-i18next';

import en from '../../../locales/en.json';
import hu from '../../../locales/hu.json';
import { useLibraryStore } from '../libraryStore';
import './persistenceNotice.scss';

export default function PersistenceNotice() {
  const { t } = useTranslation();
  const warning = useLibraryStore((state) => state.persistenceWarning);

  if (!warning) {
    return null;
  }

  // Warnings can predate a language switch; keep the stored warning's identity.
  const keys = Object.keys(en.ui) as (keyof typeof en.ui)[];
  const key = keys.find(
    (entry) => en.ui[entry] === warning || hu.ui[entry] === warning
  );

  return (
    <p className="library-persistence-notice" role="status" aria-live="polite">
      {key ? t(`ui.${key}`) : warning}
    </p>
  );
}
