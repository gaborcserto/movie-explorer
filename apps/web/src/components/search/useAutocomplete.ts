import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { SearchSuggestion } from '@movie-explorer/contracts';
import { isCancelledError } from '../../util/errorPresentation';
import { getSearchSuggestions } from '../../util/apiUtils';
import { mediaPath } from '../../util/seriesRoutes';

export default function useAutocomplete(committedQuery = '', enabled = true) {
  const [query, setQuery] = useState(committedQuery);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [failed, setFailed] = useState(false);
  const [message, setMessage] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const listId = useId();
  const navigate = useNavigate();
  const location = useLocation();

  const dismiss = () => {
    generation.current += 1;
    controllerRef.current?.abort();
    setOpen(false);
    setActive(-1);
    setMessage('');
    setFailed(false);
  };

  useEffect(() => {
    setQuery(committedQuery);
    generation.current += 1;
    controllerRef.current?.abort();
    setSuggestions([]);
    setOpen(false);
    setActive(-1);
    setMessage('');
    setFailed(false);
  }, [committedQuery, location.key]);

  useEffect(() => {
    generation.current += 1;
    const { current } = generation;
    const controller = new AbortController();
    controllerRef.current = controller;
    const text = query.trim();

    if (!enabled || text.length < 2 || text === committedQuery) {
      return () => controller.abort();
    }
    const timer = window.setTimeout(async () => {
      if (current !== generation.current) {
        return;
      }
      setMessage('Loading suggestions…');
      try {
        const response = await getSearchSuggestions(text, controller.signal);

        if (controller.signal.aborted || current !== generation.current) {
          return;
        }
        // Keep grouping and keyboard order identical even if API order changes.
        const items = ['movie', 'tv', 'person'].flatMap((type) =>
          response.suggestions
            .filter((item) => item.mediaType === type)
            .slice(0, 6)
        );
        const partial =
          response.groups &&
          Object.values(response.groups).some(
            (group) => group.status === 'unavailable'
          );
        setFailed(Boolean(partial));
        setSuggestions(items);
        setOpen(items.length > 0);
        setActive(-1);
        const emptyMessage = partial
          ? 'Some suggestions unavailable. Press Enter to search.'
          : 'No suggestions found. Press Enter to search.';
        setMessage(
          items.length
            ? `${items.length} suggestions available. Use arrow keys to navigate.${partial ? ' Some suggestions unavailable.' : ''}`
            : emptyMessage
        );
      } catch (error: unknown) {
        if (
          controller.signal.aborted ||
          current !== generation.current ||
          isCancelledError(error)
        ) {
          return;
        }
        setFailed(true);
        setActive(-1);
        setSuggestions([]);
        setOpen(false);
        setMessage('Suggestions unavailable. Press Enter to search.');
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, committedQuery, enabled]);

  useEffect(() => {
    const outside = (event: MouseEvent) => {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      ) {
        dismiss();
      }
    };
    document.addEventListener('mousedown', outside);

    return () => document.removeEventListener('mousedown', outside);
  }, []);

  useEffect(() => {
    if (open && active >= 0) {
      document
        .getElementById(`${listId}-${active}`)
        ?.scrollIntoView?.({ block: 'nearest' });
    }
  }, [active, open, listId]);

  const edit = (value: string) => {
    dismiss();
    setSuggestions([]);
    setQuery(value);
  };

  const choose = (item: SearchSuggestion) => {
    dismiss();
    navigate(mediaPath(item.mediaType, item.id));
  };

  const submit = () => {
    dismiss();
    const text = query.trim();
    // Carry only search-page controls; detail-only query parameters never escape.
    const params = new URLSearchParams();

    if (location.pathname.startsWith('/search')) {
      const current = new URLSearchParams(location.search);
      ['view', 'filter', 'year', 'rating', 'sorting', 'order'].forEach(
        (key) => {
          const value = current.get(key);

          if (value) {
            params.set(key, value);
          }
        }
      );
    }
    navigate(
      `/search${text ? `/${encodeURIComponent(text)}` : ''}${params.size ? `?${params}` : ''}`
    );
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      dismiss();
    } else if (open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      setActive((current) => {
        if (current < 0) {
          return direction > 0 ? 0 : suggestions.length - 1;
        }

        return (current + direction + suggestions.length) % suggestions.length;
      });
    } else if (
      event.key === 'Enter' &&
      open &&
      active >= 0 &&
      suggestions[active]
    ) {
      event.preventDefault();
      choose(suggestions[active]);
    }
  };

  return {
    query,
    edit,
    suggestions,
    open,
    active,
    setActive,
    message,
    failed,
    listId,
    containerRef,
    dismiss,
    choose,
    submit,
    onKeyDown,
    inputProps: {
      role: 'combobox' as const,
      'aria-describedby': failed ? `${listId}-failure` : undefined,
      'aria-autocomplete': 'list' as const,
      'aria-expanded': open,
      'aria-controls': open ? listId : undefined,
      'aria-activedescendant':
        open && active >= 0 && suggestions[active]
          ? `${listId}-${active}`
          : undefined,
      onKeyDown,
    },
    onBlur: (event: React.FocusEvent<HTMLElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget)) {
        dismiss();
      }
    },
  };
}
