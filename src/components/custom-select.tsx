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
  portal = false,
  allowClear = false,
  id,
  "aria-label": ariaLabel,
}: CustomSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
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
    const expectedHeight = Math.min(options.length * 36 + 12, 240);
    const placeTop = spaceBelow < expectedHeight && spaceAbove > spaceBelow;

    setMenuPos({
      top: placeTop ? Math.max(8, rect.top - expectedHeight - 4) : rect.bottom + 4,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - Math.max(rect.width, 160) - 8)),
      width: Math.max(rect.width, 140),
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

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
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
      className={`relative w-full inline-flex items-center justify-between rounded-[4px] border border-slate-200 bg-white font-medium text-slate-800 transition-colors cursor-pointer select-none
        hover:border-slate-300 hover:bg-slate-50/60
        focus:outline-none focus:ring-1.5 focus:ring-primary/30 focus:border-primary
        disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100
        ${open ? "ring-1.5 ring-primary/30 border-primary shadow-xs" : "shadow-2xs"}
        ${sizeClasses}
        ${buttonClassName}
      `}
    >
      <span className="truncate text-left flex-1 min-w-0 font-medium">
        {selectedLabel}
      </span>
      <svg
        className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform duration-150 ease-out ${
          open ? "rotate-180 text-primary" : ""
        }`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );

  const menuContent = open ? (
    <ul
      ref={menuRef}
      role="listbox"
      aria-labelledby={selectId}
      style={
        portal && menuPos
          ? {
              position: "fixed",
              top: menuPos.top,
              left: menuPos.left,
              width: menuPos.width,
              zIndex: 99999,
            }
          : undefined
      }
      className={`max-h-60 overflow-y-auto rounded-[4px] border border-slate-200/90 bg-white py-1 shadow-xl text-xs
        focus:outline-none
        ${portal ? "" : "absolute z-50 mt-1 left-0 right-0 min-w-full"}
        ${menuClassName}
      `}
    >
      {options.map((opt) => {
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
              className={`w-full text-left px-3 py-2 transition-colors cursor-pointer flex items-center justify-between gap-2 select-none
                ${opt.disabled ? "opacity-40 cursor-not-allowed" : ""}
                ${
                  isSelected
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                }
              `}
            >
              <span className="truncate flex-1 min-w-0">{opt.label}</span>
              {isSelected && (
                <svg
                  className="w-3.5 h-3.5 shrink-0 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  ) : null;

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className}`}>
      {triggerButton}
      {portal && mounted ? createPortal(menuContent, document.body) : menuContent}
    </div>
  );
}

export default CustomSelect;
