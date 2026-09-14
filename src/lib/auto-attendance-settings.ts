"use client";

import { useEffect, useState, useCallback } from "react";

export interface AutoAttendanceSettings {
  enabled: boolean;
  staffIds: number[]; // List of staff staging IDs configured for auto check-in
  autoCheckInTime?: string; // Optional fixed check-in time like "08:00"
  autoRunOnLoad?: boolean; // Automatically run when loading dashboard
}

export const DEFAULT_AUTO_ATTENDANCE_SETTINGS: AutoAttendanceSettings = {
  enabled: false,
  staffIds: [],
  autoCheckInTime: "",
  autoRunOnLoad: true,
};

const STORAGE_KEY = "hatico_auto_attendance_settings";
const EVENT_NAME = "hatico_auto_attendance_settings_updated";

export function getAutoAttendanceSettings(): AutoAttendanceSettings {
  if (typeof window === "undefined") {
    return DEFAULT_AUTO_ATTENDANCE_SETTINGS;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_AUTO_ATTENDANCE_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AutoAttendanceSettings>;
    return {
      enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : DEFAULT_AUTO_ATTENDANCE_SETTINGS.enabled,
      staffIds: Array.isArray(parsed.staffIds) ? parsed.staffIds : DEFAULT_AUTO_ATTENDANCE_SETTINGS.staffIds,
      autoCheckInTime: typeof parsed.autoCheckInTime === "string" ? parsed.autoCheckInTime : DEFAULT_AUTO_ATTENDANCE_SETTINGS.autoCheckInTime,
      autoRunOnLoad: typeof parsed.autoRunOnLoad === "boolean" ? parsed.autoRunOnLoad : DEFAULT_AUTO_ATTENDANCE_SETTINGS.autoRunOnLoad,
    };
  } catch {
    return DEFAULT_AUTO_ATTENDANCE_SETTINGS;
  }
}

export function saveAutoAttendanceSettings(settings: AutoAttendanceSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: settings }));
  } catch (err) {
    console.error("Failed to save auto-attendance settings to localStorage:", err);
  }
}

export function useAutoAttendanceSettings() {
  const [settings, setSettings] = useState<AutoAttendanceSettings>(() => getAutoAttendanceSettings());

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<AutoAttendanceSettings>;
      if (customEvent.detail) {
        setSettings(customEvent.detail);
      } else {
        setSettings(getAutoAttendanceSettings());
      }
    };

    window.addEventListener(EVENT_NAME, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(EVENT_NAME, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const updateSettings = useCallback((newSettings: AutoAttendanceSettings) => {
    setSettings(newSettings);
    saveAutoAttendanceSettings(newSettings);
  }, []);

  return {
    settings,
    updateSettings,
  };
}
