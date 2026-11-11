"use client";

import React, { useEffect, useRef, useState } from "react";
import type { WorkReportStaffItem } from "@/app/actions";

interface SearchableStaffSelectProps {
  staffList: WorkReportStaffItem[];
  selectedStaffId: string;
  onSelect: (staffId: string) => void;
  disabled?: boolean;
  className?: string;
}

export function SearchableStaffSelect({
  staffList,
  selectedStaffId,
  onSelect,
  disabled = false,
  className = "",
}: SearchableStaffSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedStaff =
    staffList.find((s) => s.id === selectedStaffId) || staffList[0];

  // Auto-focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    }
  }, [isOpen]);

  // Click outside and Escape handler
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Filter staff by search query
  const filteredStaff = staffList.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      s.full_name.toLowerCase().includes(q) ||
      (s.branch_name && s.branch_name.toLowerCase().includes(q)) ||
      (s.department_name && s.department_name.toLowerCase().includes(q))
    );
  });

  const handleSelectItem = (id: string) => {
    onSelect(id);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`h-9 px-2.5 sm:px-3 bg-white border border-[#E4E7EC] hover:border-[#17365D]/50 rounded-md text-xs text-[#202936] flex items-center justify-between gap-1.5 sm:gap-2.5 transition-colors shadow-xs w-full max-w-full sm:max-w-[340px] text-left cursor-pointer ${
          isOpen ? "ring-2 ring-[#17365D]/15 border-[#17365D]" : ""
        } ${disabled ? "opacity-60 cursor-not-allowed bg-[#F7F8FA]" : ""}`}
      >
        <div className="flex items-center gap-2 min-w-0">
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
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <div className="min-w-0 truncate">
            <span className="font-semibold text-[#202936] truncate">
              {selectedStaff?.full_name || "Chọn nhân viên"}
            </span>
            {selectedStaff?.branch_name && (
              <span className="text-[#667085] ml-1 text-[11px] truncate hidden md:inline">
                ({selectedStaff.branch_name})
              </span>
            )}
          </div>
        </div>

        <svg
          className={`w-3.5 h-3.5 text-[#667085] shrink-0 transition-transform duration-150 ${
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
      </button>

      {/* Dropdown Menu with Integrated Search (Mobile Modal Sheet / Desktop Anchored) */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-2xs sm:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div className="max-sm:fixed max-sm:inset-x-4 max-sm:top-1/2 max-sm:-translate-y-1/2 max-sm:w-auto max-sm:max-w-sm max-sm:mx-auto max-sm:z-[9999] max-sm:shadow-2xl sm:absolute sm:left-0 sm:top-full sm:mt-1.5 sm:z-50 sm:w-80 bg-white border border-[#E4E7EC] rounded-xl sm:rounded-lg shadow-xl p-3 sm:p-2 text-xs text-[#202936] animate-in fade-in zoom-in-95 duration-100">
            {/* Header for mobile */}
            <div className="flex sm:hidden items-center justify-between pb-2 mb-2 border-b border-[#E4E7EC]">
              <span className="font-bold text-[#17365D] text-sm">Chọn nhân viên báo cáo</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[#667085] hover:text-[#202936] p-1 text-base font-bold"
              >
                ✕
              </button>
            </div>

            {/* Search Box */}
            <div className="relative mb-2">
              <svg
                className="w-3.5 h-3.5 text-[#667085] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
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
                placeholder="Tìm tên nhân viên, chi nhánh..."
                className="w-full h-9 sm:h-8 pl-8 pr-7 bg-[#F7F8FA] border border-[#E4E7EC] rounded-md text-base sm:text-xs text-[#202936] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#17365D] focus:border-[#17365D]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#98A2B3] hover:text-[#202936] p-0.5 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Staff List */}
            <div className="max-h-64 sm:max-h-56 overflow-y-auto no-scrollbar space-y-1 sm:space-y-0.5">
              {filteredStaff.length === 0 ? (
                <div className="py-4 text-center text-xs text-[#667085]">
                  Không tìm thấy nhân viên &ldquo;{searchQuery}&rdquo;
                </div>
              ) : (
                filteredStaff.map((staff) => {
                  const isSelected = staff.id === selectedStaffId;
                  return (
                    <div
                      key={staff.id}
                      onClick={() => handleSelectItem(staff.id)}
                      className={`px-3 py-2.5 sm:py-2 rounded-lg sm:rounded-md flex items-center justify-between cursor-pointer transition-colors min-h-[44px] ${
                        isSelected
                          ? "bg-[#EDF2F8] text-[#17365D]"
                          : "hover:bg-[#F2F4F7] active:bg-[#EDF2F8] text-[#202936]"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div
                          className={`font-semibold sm:font-medium text-xs truncate ${
                            isSelected ? "font-bold text-[#17365D]" : "text-[#202936]"
                          }`}
                        >
                          {staff.full_name}
                        </div>
                        <div className="text-[11px] text-[#667085] truncate">
                          {staff.branch_name || "Hatico"}
                          {staff.department_name ? ` · ${staff.department_name}` : ""}
                        </div>
                      </div>

                      {isSelected && (
                        <svg
                          className="w-4 h-4 text-[#17365D] shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

