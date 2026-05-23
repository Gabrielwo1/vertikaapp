import { useState, useCallback, useRef, useEffect } from 'react';
import { api } from '@/services/api';
import { validateSettings } from '@virtualtour/shared';
import { AUTOSAVE_DEBOUNCE_MS } from '@/constants';
import type { ExperienceSettings } from '@virtualtour/shared';

interface UseSettingsReturn {
  settings: ExperienceSettings | null;
  isLoading: boolean;
  saveSettings: (s: ExperienceSettings) => void;
  forceSave: () => Promise<void>;
  isDirty: boolean;
  lastSaved: Date | null;
}

export function useSettings(tourId: string): UseSettingsReturn {
  const [settings, setSettings] = useState<ExperienceSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const pendingSettingsRef = useRef<ExperienceSettings | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load settings on mount
  useEffect(() => {
    if (!tourId) return;

    setIsLoading(true);
    api.tours
      .getSettings(tourId)
      .then((tour) => {
        if (tour.settingsJson) {
          try {
            const validated = validateSettings(tour.settingsJson);
            setSettings(validated);
          } catch {
            // If settings don't validate, use null
            setSettings(null);
          }
        } else {
          setSettings(null);
        }
      })
      .catch(console.error)
      .finally(() => {
        setIsLoading(false);
      });
  }, [tourId]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const persistSettings = useCallback(
    async (s: ExperienceSettings): Promise<void> => {
      try {
        validateSettings(s);
        await api.tours.saveSettings(tourId, s);
        setLastSaved(new Date());
        setIsDirty(false);
      } catch (err) {
        console.error('[useSettings] Falha ao salvar configurações:', err);
      }
    },
    [tourId],
  );

  const saveSettings = useCallback(
    (s: ExperienceSettings): void => {
      setSettings(s);
      setIsDirty(true);
      pendingSettingsRef.current = s;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        if (pendingSettingsRef.current) {
          void persistSettings(pendingSettingsRef.current);
        }
      }, AUTOSAVE_DEBOUNCE_MS);
    },
    [persistSettings],
  );

  const forceSave = useCallback(async (): Promise<void> => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const current = pendingSettingsRef.current ?? settings;
    if (current) {
      await persistSettings(current);
    }
  }, [settings, persistSettings]);

  return { settings, isLoading, saveSettings, forceSave, isDirty, lastSaved };
}
