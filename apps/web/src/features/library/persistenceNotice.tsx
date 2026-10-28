import { useLibraryStore } from './libraryStore';
import './persistenceNotice.scss';

export default function PersistenceNotice() {
  const warning = useLibraryStore((state) => state.persistenceWarning);

  if (!warning) {
    return null;
  }

  return (
    <p className="library-persistence-notice" role="status" aria-live="polite">
      {warning}
    </p>
  );
}
