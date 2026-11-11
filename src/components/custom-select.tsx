"use client";

import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useId,
} from "react";
import { createPortal } from "react-dom";

export type CustomSelectOption<T extends string | number = string | number> = {
  value: T;
  label: React.ReactNode;
  disabled?: boolean;
};

export interface CustomSelectProps<T extends string | number = string | number> {
  value: T;
  options: readonly CustomSelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string | React.ReactNode;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  size?: "xs" | "sm" | "md";
  disabled?: boolean;
  portal?: boolean;
  allowClear?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  id?: string;
  "aria-label"?: string;
}

type MenuPos = {
  top: number;
  left: number;
  width: number;
  placement: "bottom" | "top";
};

export function CustomSelect<T extends string | number = string | number>({
  value,
  options,
  onChange,
  placeholder = "Chọn...",
  className = "",
  buttonClassName = "",
  menuClassName = "",
  size = "sm",
  disabled = false,
  portal = true,
  allowClear = false,
  searchable = false,
  searchPlaceholder = "Tìm kiếm...",
  id,
  "aria-label": ariaLabel,
}: CustomSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);
  const [mounted, setMounted] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const generatedId = useId();
  const selectId = id || generatedId;

  const currentOption = options.find((opt) => opt.value === value);
  const selectedLabel = currentOption ? currentOption.label : placeholder;

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = () => {
    if (!rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const expectedHeight = Math.min(options.length * 36 + 48, 260);
    const placeTop = spaceBelow < expectedHeight && spaceAbove > spaceBelow;

    setMenuPos({
      top: placeTop
        ? Math.max(8, rect.top - expectedHeight - 4)
        : Math.min(window.innerHeight - 80, rect.bottom + 4),
      left: Math.max(
        8,
        Math.min(rect.left, window.innerWidth - Math.max(rect.width, 180) - 8)
      ),
      width: Math.max(rect.width, 160),
      placement: placeTop ? "top" : "bottom",
    });
  };

  useLayoutEffect(() => {
    if (!open || !portal) return;
    updatePosition();
    const handleScrollOrResize = () => updatePosition();
    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("scroll", handleScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("scroll", handleScrollOrResize, true);
    };
  }, [open, portal, options.length]);

  // Click outside and Escape handler
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        rootRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  // Reset and auto focus search input when opened
  useEffect(() => {
    if (open) {
      setSearchQuery("");
      if (searchable) {
        requestAnimationFrame(() => {
          searchInputRef.current?.focus();
        });
      }
    }
  }, [open, searchable]);

  // Filter options if search query present
  const filteredOptions = options.filter((opt) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    if (typeof opt.label === "string") {
      return opt.label.toLowerCase().includes(q);
    }
    return String(opt.value).toLowerCase().includes(q);
  });

  const sizeClasses = {
    xs: "h-7 px-2 text-[11px] gap-1.5",
    sm: "h-8 px-2.5 text-xs gap-2",
    md: "h-9 px-3 text-xs gap-2",
  }[size];

  const triggerButton = (
    <button
      id={selectId}
      type="button"
      disabled={disabled}
      aria-label={ariaLabel}
      aria-haspopup="listbox"
      aria-expanded={open}
      onClick={() => {
        if (disabled) return;
        setOpen((prev) => {
          const next = !prev;
          if (next && portal) {
            updatePosition();
          }
          return next;
        });
      }}
      className={`relative w-full inline-flex items-center justify-between rounded-md border border-[#E4E7EC] bg-white font-medium text-[#202936] transition-colors cursor-pointer select-none
        hover:border-[#17365D]/40 hover:bg-[#F9FAFB]
        focus:outline-none focus:ring-1.5 focus:ring-[#17365D]/20 focus:border-[#17365D]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[#F2F4F7]
        ${open ? "ring-1.5 ring-[#17365D]/20 border-[#17365D]" : "shadow-2xs"}
        ${sizeClasses}
        ${buttonClassName}
      `}
    >
      <span className="truncate text-left flex-1 min-w-0">
        {selectedLabel}
      </span>
      <div className="flex items-center gap-1 shrink-0 ml-1">
        {allowClear && value !== "" && !disabled && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onChange("" as unknown as T);
            }}
            className="p-0.5 text-[#98A2B3] hover:text-[#202936] rounded transition-colors cursor-pointer"
            title="Xóa lựa chọn"
          >
            ✕
          </span>
        )}
        <svg
          className={`w-3.5 h-3.5 text-[#667085] transition-transform duration-150 ease-out ${
            open ? "rotate-180 text-[#17365D]" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 9l6 6 6-6"
          />
        </svg>
      </div>
    </button>
  );

  const isMobile = mounted && typeof window !== "undefined" && window.innerWidth < 640;

  const menuContent = open ? (
    <>
      {isMobile && (
        <div
          className="fixed inset-0 z-[99998] bg-black/40 backdrop-blur-2xs"
          onClick={() => setOpen(false)}
        />
      )}
      <div
        ref={menuRef}
        style={
          isMobile
            ? {
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "min(320px, calc(100vw - 2rem))",
                zIndex: 99999,
              }
            : portal && menuPos
            ? {
                position: "fixed",
                top: menuPos.top,
                left: menuPos.left,
                width: menuPos.width,
                zIndex: 99999,
              }
            : undefined
        }
        className={`rounded-xl sm:rounded-lg border border-[#E4E7EC] bg-white shadow-2xl sm:shadow-xl text-xs overflow-hidden select-none animate-in fade-in zoom-in-95 duration-100
          ${portal ? "" : "absolute z-50 mt-1 left-0 right-0 min-w-full"}
          ${menuClassName}
        `}
      >
        {/* Search Input when searchable or long list */}
        {(searchable || options.length > 8) && (
          <div className="p-2 border-b border-[#F2F4F7] bg-[#FAFBFD]">
            <div className="relative">
              <svg
                className="w-3.5 h-3.5 text-[#98A2B3] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full h-8 sm:h-7 pl-7 pr-6 bg-white border border-[#E4E7EC] rounded text-base sm:text-[11px] text-[#202936] focus:outline-none focus:ring-1 focus:ring-[#17365D] focus:border-[#17365D]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#98A2B3] hover:text-[#202936] text-[10px] p-0.5"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}

        {/* Options List */}
        <ul
          role="listbox"
          aria-labelledby={selectId}
          className="max-h-60 sm:max-h-56 overflow-y-auto py-1 focus:outline-none no-scrollbar"
        >
          {filteredOptions.length === 0 ? (
            <li className="py-3 px-3 text-center text-xs text-[#98A2B3]">
              Không tìm thấy kết quả
            </li>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <li
                  key={String(opt.value)}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={opt.disabled}
                >
                  <button
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => {
                      if (opt.disabled) return;
                      if (isSelected && allowClear) {
                        onChange("" as unknown as T);
                      } else {
                        onChange(opt.value);
                      }
                      setOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 sm:px-3 sm:py-1.5 transition-colors cursor-pointer flex items-center justify-between gap-2 select-none min-h-[40px] sm:min-h-[32px]
                      ${opt.disabled ? "opacity-40 cursor-not-allowed" : ""}
                      ${
                        isSelected
                          ? "bg-[#EDF2F8] text-[#17365D] font-semibold"
                          : "text-[#202936] hover:bg-[#F2F4F7] active:bg-[#EDF2F8]"
                      }
                    `}
                  >
                    <span className="truncate flex-1 min-w-0">{opt.label}</span>
                    {isSelected && (
                      <svg
                        className="w-3.5 h-3.5 shrink-0 text-[#17365D]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </>
  ) : null;

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className}`}>
      {triggerButton}
      {portal && mounted
        ? createPortal(menuContent, document.body)
        : menuContent}
    </div>
  );
}

export default CustomSelect;
