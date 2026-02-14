import { useState, useEffect } from 'react';

const CALENDAR_SETTINGS_KEY = 'caberu_calendar_settings';

interface CalendarSettings {
  hideNonWorkingDays: boolean;
}

const defaultSettings: CalendarSettings = {
  hideNonWorkingDays: false,
};

export function useCalendarSettings() {
  const [settings, setSettings] = useState<CalendarSettings>(() => {
    try {
      const stored = localStorage.getItem(CALENDAR_SETTINGS_KEY);
      if (stored) {
        return { ...defaultSettings, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading calendar settings:', error);
    }
    return defaultSettings;
  });

  useEffect(() => {
    try {
      localStorage.setItem(CALENDAR_SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving calendar settings:', error);
    }
  }, [settings]);

  const updateSettings = (newSettings: Partial<CalendarSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return {
    settings,
    updateSettings,
    hideNonWorkingDays: settings.hideNonWorkingDays,
    setHideNonWorkingDays: (value: boolean) => updateSettings({ hideNonWorkingDays: value }),
  };
}
