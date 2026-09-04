"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

export type NavTabOption<T extends string> = {
  value: T;
  label: string;
  shortLabel?: string;
};

interface NavTabsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly NavTabOption<T>[];
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  variant?: "default" | "glass";
}

export function NavTabs<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className = "",
  disabled = false,
  variant = "default",
}: NavTabsProps<T>) {
  const isGlass = variant === "glass";
  const tablistRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef(new Map<T, HTMLButtonElement>());
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const updateIndicator = useCallback(() => {
    const btn = tabRefs.current.get(value);
    const list = tablistRef.current;
    if (!btn || !list) return;
    const listRect = list.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    setIndicator({
      left: btnRect.left - listRect.left,
      width: btnRect.width,
    });
  }, [value]);

  useLayoutEffect(() => {
    updateIndicator();
    const list = tablistRef.current;
    if (!list) return;

    const ro = new ResizeObserver(updateIndicator);
    ro.observe(list);
    window.addEventListener("resize", updateIndicator);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateIndicator);
    };
  }, [updateIndicator, options]);

  return (
    <div
      ref={tablistRef}
      role="tablist"
      aria-label={ariaLabel}
      className={`relative flex items-center gap-4 sm:gap-6 border-b border-slate-200 shrink-0 overflow-x-auto no-scrollbar ${className}`}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          ref={(el) => {
            if (el) tabRefs.current.set(opt.value, el);
          }}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          disabled={disabled}
          onClick={() => onChange(opt.value)}
          className={`pb-2.5 pt-0.5 text-xs sm:text-[13px] transition-colors cursor-pointer touch-manipulation whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed shrink-0 ${
            value === opt.value
              ? "text-slate-900 font-semibold"
              : "text-slate-500 hover:text-slate-900 font-medium"
          }`}
        >
          <span className="sm:hidden">{opt.shortLabel ?? opt.label}</span>
          <span className="hidden sm:inline">{opt.label}</span>
        </button>
      ))}
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-0 h-0.5 bg-primary rounded-full transition-[left,width] duration-200 ease-out"
        style={{ left: indicator.left, width: indicator.width }}
      />
    </div>
  );
}
