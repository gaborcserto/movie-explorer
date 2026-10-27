import { useEffect } from 'react';
import type { RefObject } from 'react';

interface FilterPanelDialogOptions {
  panel: RefObject<HTMLDivElement | null>;
  mobile: boolean;
  onClose: () => void;
}

export default function useFilterPanelDialog({
  panel,
  mobile,
  onClose,
}: FilterPanelDialogOptions) {
  useEffect(() => {
    const element = panel.current;

    if (!element) {
      return undefined;
    }

    const previousFocus = document.activeElement;
    element.focus();

    const previousOverflow = document.body.style.overflow;
    const background = mobile
      ? Array.from(document.querySelectorAll<HTMLElement>('body > *')).filter(
          (node) => !node.contains(element)
        )
      : [];
    const previousInert = background.map((node) => node.inert);

    if (mobile) {
      document.body.style.overflow = 'hidden';
    }

    background.forEach((node) => {
      node.inert = true;
    });

    const focusables = () =>
      Array.from(
        element.querySelectorAll<HTMLElement>(
          'button, input, select, [tabindex="0"]'
        )
      ).filter(
        (node) => !node.closest('[inert]') && !node.hasAttribute('disabled')
      );

    const containFocus = (event: FocusEvent) => {
      if (
        mobile &&
        event.target instanceof Node &&
        !element.contains(event.target)
      ) {
        element.focus();
      }
    };

    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }

      if (mobile && event.key === 'Tab') {
        const items = focusables();
        const first = items[0];
        const last = items.at(-1);

        if (
          event.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === element)
        ) {
          event.preventDefault();
          last?.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last ||
            document.activeElement === element)
        ) {
          event.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener('keydown', keydown);
    document.addEventListener('focusin', containFocus);

    return () => {
      document.body.style.overflow = previousOverflow;
      background.forEach((node, index) => {
        node.inert = previousInert[index];
      });
      document.removeEventListener('keydown', keydown);
      document.removeEventListener('focusin', containFocus);

      if (
        previousFocus instanceof HTMLElement &&
        previousFocus.isConnected &&
        !previousFocus.closest('[hidden]') &&
        (element.contains(document.activeElement) ||
          document.activeElement === document.body)
      ) {
        previousFocus.focus();
      }
    };
  }, [mobile, onClose, panel]);
}
