"use client";

import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

interface CustomDatePickerProps {
  value: string; // "YYYY-MM-DD" or ""
  onChange: (dateStr: string) => void;
  className?: string;
  disabled?: boolean;
  allowClear?: boolean;
  portal?: boolean;
  placeholder?: string;
  size?: "xs" | "sm" | "md";
}

const MONTH_NAMES = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];

const WEEKDAY_NAMES = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function parseIso(iso: string): { year: number; month: number; day: number } | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map((v) => parseInt(v, 10));
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return { year: y, month: m, day: d };
}

function formatIso(year: number, month: number, day: number): string {
  const y = String(year).padStart(4, "0");
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplay(iso: string): string {
  const p = parseIso(iso);
  if (!p) return "";
  return `${String(p.day).padStart(2, "0")}/${String(p.month).padStart(2, "0")}/${p.year}`;
}

function getTodayIso(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

type MenuPos = {
  top: number;
  left: number;
  placement: "bottom" | "top";
};

export function CustomDatePicker({
  value,
  onChange,
  className = "",
  disabled = false,
  allowClear = false,
  portal = true,
  placeholder = "dd/mm/yyyy",
  size = "md",
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pickerView, setPickerView] = useState<"days" | "months" | "years">("days");
  const [mounted, setMounted] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);

  const todayIso = getTodayIso();
  const parsedToday = parseIso(todayIso)!;
  const parsedValue = parseIso(value) || parsedToday;

  // Calendar navigation state (year & month being viewed)
  const [viewYear, setViewYear] = useState<number>(parsedValue.year);
  const [viewMonth, setViewMonth] = useState<number>(parsedValue.month);

  // Direct text edit state
  const [textInput, setTextInput] = useState<string>(formatDisplay(value));
  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync text input when external value changes
  useEffect(() => {
    setTextInput(formatDisplay(value));
    const p = parseIso(value);
    if (p) {
      setViewYear(p.year);
      setViewMonth(p.month);
    }
  }, [value]);

  const updatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const expectedHeight = 320;
    const placeTop = spaceBelow < expectedHeight && spaceAbove > spaceBelow;

    setMenuPos({
      top: placeTop
        ? Math.max(8, rect.top - expectedHeight - 4)
        : Math.min(window.innerHeight - 80, rect.bottom + 4),
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 300)),
      placement: placeTop ? "top" : "bottom",
    });
  };

  useLayoutEffect(() => {
    if (!isOpen || !portal) return;
    updatePosition();
    const handleScrollOrResize = () => updatePosition();
    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("scroll", handleScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("scroll", handleScrollOrResize, true);
    };
  }, [isOpen, portal]);

  // Click outside and Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current?.contains(target) ||
        popupRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
      setPickerView("days");
      setTextInput(formatDisplay(value));
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setPickerView("days");
        setTextInput(formatDisplay(value));
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, value]);

  // Navigation handlers
  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (year: number, month: number, day: number) => {
    const newIso = formatIso(year, month, day);
    onChange(newIso);
    setIsOpen(false);
    setPickerView("days");
  };

  const handleSelectToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(todayIso);
    setViewYear(parsedToday.year);
    setViewMonth(parsedToday.month);
    setIsOpen(false);
    setPickerView("days");
  };

  const handleClearDate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setTextInput("");
    setIsOpen(false);
    setPickerView("days");
  };

  // Direct keyboard input validation on Blur or Enter
  const handleInputBlur = () => {
    const raw = textInput.trim();
    if (!raw && allowClear) {
      onChange("");
      return;
    }
    const parts = raw.split(/[/.-]/);
    if (parts.length === 3) {
      let d = parseInt(parts[0], 10);
      let m = parseInt(parts[1], 10);
      let y = parseInt(parts[2], 10);
      if (y < 100) y += 2000;
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 2000 && y <= 2100) {
        const newIso = formatIso(y, m, d);
        onChange(newIso);
        setTextInput(formatDisplay(newIso));
        return;
      }
    }
    setTextInput(formatDisplay(value));
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleInputBlur();
      setIsOpen(false);
    }
  };

  // Build calendar matrix (Monday first)
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth - 1, 1).getDay();
  const startOffset = (firstDayOfWeek + 6) % 7; // Monday is 0
  const prevMonthDays = new Date(viewYear, viewMonth - 1, 0).getDate();

  const calendarDays: Array<{
    year: number;
    month: number;
    day: number;
    isCurrentMonth: boolean;
    iso: string;
  }> = [];

  for (let i = startOffset - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const m = viewMonth === 1 ? 12 : viewMonth - 1;
    const y = viewMonth === 1 ? viewYear - 1 : viewYear;
    calendarDays.push({
      year: y,
      month: m,
      day: d,
      isCurrentMonth: false,
      iso: formatIso(y, m, d),
    });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push({
      year: viewYear,
      month: viewMonth,
      day: d,
      isCurrentMonth: true,
      iso: formatIso(viewYear, viewMonth, d),
    });
  }

  const remainingCells = 42 - calendarDays.length;
  for (let d = 1; d <= remainingCells; d++) {
    const m = viewMonth === 12 ? 1 : viewMonth + 1;
    const y = viewMonth === 12 ? viewYear + 1 : viewYear;
    calendarDays.push({
      year: y,
      month: m,
      day: d,
      isCurrentMonth: false,
      iso: formatIso(y, m, d),
    });
  }

  // Years range: 12 years window around viewYear
  const yearStart = Math.floor(viewYear / 10) * 10 - 1;
  const yearOptions = Array.from({ length: 12 }, (_, i) => yearStart + i);

  const sizeClasses = {
    xs: "h-7 px-2 text-[11px]",
    sm: "h-8 px-2.5 text-xs",
    md: "h-9 px-3 text-xs",
  }[size];

  const isMobile = mounted && typeof window !== "undefined" && window.innerWidth < 640;

  const popupContent = isOpen ? (
    <>
      {isMobile && (
        <div
          className="fixed inset-0 z-[99998] bg-black/40 backdrop-blur-2xs"
          onClick={() => {
            setIsOpen(false);
            setPickerView("days");
            setTextInput(formatDisplay(value));
          }}
        />
      )}
      <div
        ref={popupRef}
        style={
          isMobile
            ? {
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                zIndex: 99999,
                width: "min(320px, calc(100vw - 2rem))",
              }
            : portal && menuPos
            ? {
                position: "fixed",
                top: menuPos.top,
                left: menuPos.left,
                zIndex: 99999,
              }
            : undefined
        }
        className={`bg-white border border-[#E4E7EC] rounded-xl sm:rounded-lg shadow-2xl sm:shadow-xl p-3.5 sm:p-3 text-xs text-[#202936] select-none animate-in fade-in zoom-in-95 duration-100 ${
          isMobile ? "w-full max-w-xs" : "w-72"
        } ${portal ? "" : "absolute left-0 top-full mt-1.5 z-50"}`}
      >
      {/* View 1: Days Calendar */}
      {pickerView === "days" && (
        <>
          {/* Calendar Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#F2F4F7]">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#F2F4F7] text-[#667085] hover:text-[#202936] transition-colors cursor-pointer"
              title="Tháng trước"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPickerView("months")}
                className="h-7 px-2 rounded-md hover:bg-[#EDF2F8] text-[#17365D] font-semibold text-xs transition-colors cursor-pointer"
              >
                {MONTH_NAMES[viewMonth - 1]}
              </button>

              <button
                type="button"
                onClick={() => setPickerView("years")}
                className="h-7 px-2 rounded-md hover:bg-[#EDF2F8] text-[#17365D] font-semibold text-xs transition-colors cursor-pointer"
              >
                {viewYear}
              </button>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#F2F4F7] text-[#667085] hover:text-[#202936] transition-colors cursor-pointer"
              title="Tháng sau"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Weekday Labels (Monday First) */}
          <div className="grid grid-cols-7 gap-1 text-center font-medium text-[11px] text-[#667085] mb-1">
            {WEEKDAY_NAMES.map((w, idx) => (
              <div key={idx} className="py-1">
                {w}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {calendarDays.map((cell, idx) => {
              const isSelected = cell.iso === value;
              const isToday = cell.iso === todayIso;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDay(cell.year, cell.month, cell.day)}
                  className={`h-7 w-full flex items-center justify-center text-xs font-medium rounded-md transition-colors cursor-pointer relative ${
                    isSelected
                      ? "bg-[#17365D] text-white font-semibold shadow-xs"
                      : cell.isCurrentMonth
                      ? "text-[#202936] hover:bg-[#EDF2F8]"
                      : "text-[#98A2B3] hover:bg-[#F2F4F7]"
                  }`}
                >
                  <span>{cell.day}</span>
                  {isToday && !isSelected && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#17365D]" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* View 2: Month Picker Grid */}
      {pickerView === "months" && (
        <div>
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#F2F4F7]">
            <span className="text-xs font-semibold text-[#17365D]">Chọn tháng ({viewYear})</span>
            <button
              type="button"
              onClick={() => setPickerView("days")}
              className="text-xs text-[#667085] hover:text-[#202936] px-1.5 py-0.5 rounded cursor-pointer"
            >
              Quay lại
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5 py-1">
            {MONTH_NAMES.map((name, i) => {
              const m = i + 1;
              const isCurrent = m === viewMonth;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setViewMonth(m);
                    setPickerView("days");
                  }}
                  className={`h-8 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    isCurrent
                      ? "bg-[#17365D] text-white font-semibold"
                      : "text-[#202936] hover:bg-[#EDF2F8]"
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* View 3: Year Picker Grid */}
      {pickerView === "years" && (
        <div>
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#F2F4F7]">
            <span className="text-xs font-semibold text-[#17365D]">Chọn năm</span>
            <button
              type="button"
              onClick={() => setPickerView("days")}
              className="text-xs text-[#667085] hover:text-[#202936] px-1.5 py-0.5 rounded cursor-pointer"
            >
              Quay lại
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5 py-1">
            {yearOptions.map((y) => {
              const isCurrent = y === viewYear;
              return (
                <button
                  key={y}
                  type="button"
                  onClick={() => {
                    setViewYear(y);
                    setPickerView("days");
                  }}
                  className={`h-8 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    isCurrent
                      ? "bg-[#17365D] text-white font-semibold"
                      : "text-[#202936] hover:bg-[#EDF2F8]"
                  }`}
                >
                  {y}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer Quick Actions */}
      <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-[#F2F4F7]">
        {allowClear && (
          <button
            type="button"
            onClick={handleClearDate}
            className="text-[11px] font-medium text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
          >
            Xóa ngày
          </button>
        )}
        <div className="ml-auto">
          <button
            type="button"
            onClick={handleSelectToday}
            className="text-[11px] font-semibold text-[#17365D] hover:underline cursor-pointer"
          >
            Hôm nay ({formatDisplay(todayIso)})
          </button>
        </div>
      </div>
      </div>
    </>
  ) : null;

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Input Display Button */}
      <div
        onClick={() => {
          if (disabled) return;
          setIsOpen((prev) => {
            const next = !prev;
            if (next && portal) updatePosition();
            return next;
          });
        }}
        className={`bg-white border border-[#E4E7EC] hover:border-[#17365D]/40 rounded-md font-medium text-[#202936] flex items-center gap-2 cursor-pointer transition-colors shadow-2xs ${sizeClasses} ${
          isOpen ? "ring-1.5 ring-[#17365D]/20 border-[#17365D]" : ""
        } ${disabled ? "opacity-50 cursor-not-allowed bg-[#F2F4F7]" : ""}`}
      >
        <svg
          className="w-4 h-4 text-[#667085] shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>

        <input
          type="text"
          value={textInput}
          disabled={disabled}
          onClick={(e) => e.stopPropagation()}
          onFocus={() => {
            if (!isOpen) {
              setIsOpen(true);
              if (portal) updatePosition();
            }
          }}
          onChange={(e) => setTextInput(e.target.value)}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          placeholder={placeholder}
          className="w-[84px] sm:w-[82px] min-w-[80px] bg-transparent text-xs font-semibold text-[#202936] focus:outline-none cursor-pointer tracking-normal sm:tracking-tight placeholder:text-[#98A2B3] placeholder:font-normal"
        />

        {allowClear && value && !disabled && (
          <button
            type="button"
            onClick={handleClearDate}
            className="text-[#98A2B3] hover:text-[#202936] p-0.5 rounded cursor-pointer"
            title="Xóa ngày"
          >
            ✕
          </button>
        )}

        <svg
          className={`w-3.5 h-3.5 text-[#667085] transition-transform duration-150 shrink-0 ${
            isOpen ? "rotate-180 text-[#17365D]" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 9l6 6 6-6"
          />
        </svg>
      </div>

      {portal && mounted
        ? createPortal(popupContent, document.body)
        : popupContent}
    </div>
  );
}

export default CustomDatePicker;
