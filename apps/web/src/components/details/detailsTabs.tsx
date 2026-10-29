import { useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';

interface Tab {
  key: string;
  label: string;
}

interface Props<TabKey extends string> {
  id: string;
  tabs: readonly (Tab & { key: TabKey })[];
  activeTab: TabKey;
  ariaLabel: string;
  onChange: (tab: TabKey) => void;
}

export default function DetailsTabs<TabKey extends string>({
  id,
  tabs,
  activeTab,
  ariaLabel,
  onChange,
}: Props<TabKey>) {
  const tabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tabsElement = tabsRef.current;
    const selectedTab = tabsElement?.querySelector<HTMLButtonElement>(
      '[aria-selected="true"]'
    );

    if (!tabsElement || !selectedTab) {
      return;
    }

    const tabsBounds = tabsElement.getBoundingClientRect();
    const selectedTabBounds = selectedTab.getBoundingClientRect();

    if (selectedTabBounds.left < tabsBounds.left) {
      tabsElement.scrollLeft -= tabsBounds.left - selectedTabBounds.left;
    } else if (selectedTabBounds.right > tabsBounds.right) {
      tabsElement.scrollLeft += selectedTabBounds.right - tabsBounds.right;
    }
  }, [activeTab]);

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentTab: TabKey
  ) => {
    const currentIndex = tabs.findIndex((tab) => tab.key === currentTab);
    let nextIndex: number;

    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = tabs.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextTab = tabs[nextIndex];

    if (!nextTab) {
      return;
    }

    onChange(nextTab.key);
    tabsRef.current
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      [nextIndex]?.focus({ preventScroll: true });
  };

  return (
    <div
      className="details-tabs"
      role="tablist"
      aria-label={ariaLabel}
      ref={tabsRef}
    >
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          id={`${id}-${tab.key}-tab`}
          aria-controls={`${id}-${tab.key}-panel`}
          aria-selected={activeTab === tab.key}
          tabIndex={activeTab === tab.key ? 0 : -1}
          onClick={() => onChange(tab.key)}
          onKeyDown={(event) => handleKeyDown(event, tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
