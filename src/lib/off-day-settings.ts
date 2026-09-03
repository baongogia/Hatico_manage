"use client";

import { useEffect, useState, useCallback } from "react";

export interface CustomHoliday {
  id: string;
  date: string; // YYYY-MM-DD (start date)
  endDate?: string; // YYYY-MM-DD (end date if range)
  name: string;
}

export interface OffDaySettings {
  weeklyOffDays: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  customHolidays: CustomHoliday[];
}

export const DEFAULT_OFF_DAY_SETTINGS: OffDaySettings = {
  weeklyOffDays: [0], // Sunday by default
  customHolidays: [
    { id: "tet-duong-lich", date: "2026-01-01", name: "Tết Dương lịch" },
    { id: "giai-phong-30-4", date: "2026-04-30", endDate: "2026-05-01", name: "Giải phóng Miền Nam & Quốc tế Lao động" },
    { id: "quoc-khanh-2-9", date: "2026-09-02", name: "Quốc khánh" },
  ],
};

const STORAGE_KEY = "hatico_off_day_settings";
const EVENT_NAME = "hatico_offday_settings_updated";

export function getOffDaySettings(): OffDaySettings {
  if (typeof window === "undefined") {
    return DEFAULT_OFF_DAY_SETTINGS;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_OFF_DAY_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<OffDaySettings>;
    return {
      weeklyOffDays: Array.isArray(parsed.weeklyOffDays)
        ? parsed.weeklyOffDays
        : DEFAULT_OFF_DAY_SETTINGS.weeklyOffDays,
      customHolidays: Array.isArray(parsed.customHolidays)
        ? parsed.customHolidays
        : DEFAULT_OFF_DAY_SETTINGS.customHolidays,
    };
  } catch {
    return DEFAULT_OFF_DAY_SETTINGS;
  }
}

export function saveOffDaySettings(settings: OffDaySettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: settings }));
  } catch (err) {
    console.error("Failed to save off-day settings to localStorage:", err);
  }
}

export interface OffDayCheckResult {
  isOff: boolean;
  reason?: string;
  isWeeklyOff?: boolean;
  isHoliday?: boolean;
}

export function checkIsOffDay(
  dateStr: string,
  settings: OffDaySettings = getOffDaySettings(),
): OffDayCheckResult {
  if (!dateStr) return { isOff: false };

  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return { isOff: false };

  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay(); // 0 = CN, 1 = T2, ..., 6 = T7

  // Check weekly recurring off-day
  if (settings.weeklyOffDays.includes(dayOfWeek)) {
    const dayNames = [
      "Chủ nhật",
      "Thứ Hai",
      "Thứ Ba",
      "Thứ Tư",
      "Thứ Năm",
      "Thứ Sáu",
      "Thứ Bảy",
    ];
    return {
      isOff: true,
      reason: `${dayNames[dayOfWeek]} (Nghỉ cố định)`,
      isWeeklyOff: true,
    };
  }

  // Check specific holiday (single date or date range)
  const holiday = settings.customHolidays.find((h) => {
    if (h.endDate && h.endDate >= h.date) {
      return dateStr >= h.date && dateStr <= h.endDate;
    }
    return h.date === dateStr;
  });

  if (holiday) {
    return {
      isOff: true,
      reason: holiday.name || "Ngày nghỉ lễ",
      isHoliday: true,
    };
  }

  return { isOff: false };
}

export function useOffDaySettings() {
  const [settings, setSettings] = useState<OffDaySettings>(() => getOffDaySettings());

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<OffDaySettings>;
      if (customEvent.detail) {
        setSettings(customEvent.detail);
      } else {
        setSettings(getOffDaySettings());
      }
    };

    window.addEventListener(EVENT_NAME, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(EVENT_NAME, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const updateSettings = useCallback((newSettings: OffDaySettings) => {
    setSettings(newSettings);
    saveOffDaySettings(newSettings);
  }, []);

  const isDateOff = useCallback(
    (dateStr: string) => checkIsOffDay(dateStr, settings),
    [settings],
  );

  return {
    settings,
    updateSettings,
    isDateOff,
  };
}
