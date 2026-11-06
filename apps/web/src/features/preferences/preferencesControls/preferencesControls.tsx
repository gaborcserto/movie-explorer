import { useTranslation } from 'react-i18next';
import { useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { FaGlobe } from 'react-icons/fa6';

import AnimatedSelect from '../../../components/animatedSelect';
import usePreferencesStore from '../preferencesStore';
import './preferencesControls.scss';

const regions = [
  'US',
  'HU',
  'GB',
  'DE',
  'AT',
  'SK',
  'RO',
  'CZ',
  'FR',
  'ES',
  'IT',
  'CA',
  'AU',
];

export default function PreferencesControls() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { preferences, updatePreferences, persistenceFailed } =
    usePreferencesStore();
  const displayNames = new Intl.DisplayNames([i18n.language], {
    type: 'region',
  });
  const availableRegions = regions.includes(preferences.region)
    ? regions
    : [preferences.region, ...regions];
  const languageOptions = [
    { value: 'en-US', label: 'English' },
    { value: 'hu-HU', label: 'Magyar' },
  ];
  const regionOptions = availableRegions.map((region) => ({
    value: region,
    label: displayNames.of(region) ?? region,
  }));

  const handleLanguageChange = (language: string) => {
    if (language === 'en-US' || language === 'hu-HU') {
      updatePreferences({ language });
    }
  };

  const handleToggle = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    setOpen((value) => {
      if (!value) {
        if (closeTimer.current) {
          clearTimeout(closeTimer.current);
          closeTimer.current = null;
        }
        setPanelVisible(true);
      } else {
        closeTimer.current = setTimeout(() => {
          setPanelVisible(false);
          closeTimer.current = null;
        }, 200);
      }

      return !value;
    });
  };

  useEffect(
    () => () => {
      if (closeTimer.current) {
        clearTimeout(closeTimer.current);
      }
    },
    []
  );

  return (
    <details className="preferences-controls" open={open}>
      <summary aria-label={t('settings.open')} onClick={handleToggle}>
        <FaGlobe aria-hidden="true" />
        <span>
          {preferences.language === 'hu-HU' ? 'HU' : 'EN'} ·{' '}
          {preferences.region}
        </span>
      </summary>
      <div
        className="preferences-controls__panel"
        aria-hidden={!open}
        inert={!open}
        data-visible={panelVisible}
      >
        <h2>{t('settings.open')}</h2>
        <label>
          {t('settings.language')}
          <AnimatedSelect
            label={t('settings.language')}
            options={languageOptions}
            value={preferences.language}
            onChange={handleLanguageChange}
          />
        </label>
        <label>
          {t('settings.region')}
          <AnimatedSelect
            label={t('settings.region')}
            options={regionOptions}
            value={preferences.region}
            onChange={(region) => updatePreferences({ region })}
          />
        </label>
        <p>{t('settings.independent')}</p>
        {persistenceFailed && (
          <p role="status">{t('settings.storageUnavailable')}</p>
        )}
      </div>
    </details>
  );
}
