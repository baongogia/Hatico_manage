"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type DialogType = "info" | "error" | "success" | "confirm";

export interface AppDialogProps {
  isOpen: boolean;
  type?: DialogType;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

export function AppDialog({
  isOpen,
  type = "info",
  title,
  message,
  confirmText,
  cancelText = "Hủy",
  isDestructive = false,
  onConfirm,
  onCancel,
}: AppDialogProps) {
  const [mounted, setMounted] = useState(false);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keyboard navigation: Escape cancels, Enter or auto-focus confirm
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (onCancel) {
          onCancel();
        } else {
          onConfirm();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const timer = setTimeout(() => {
      confirmBtnRef.current?.focus();
    }, 50);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen, onCancel, onConfirm]);

  if (!isOpen || !mounted) return null;

  const isConfirmDialog = type === "confirm" || Boolean(onCancel);
  const defaultConfirmText = isConfirmDialog
    ? isDestructive
      ? "Xóa"
      : "Xác nhận"
    : "Đã hiểu";
  const finalConfirmText = confirmText || defaultConfirmText;

  // Icon configuration based on type and destructive flag
  const renderIcon = () => {
    if (isDestructive || type === "error") {
      return (
        <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
          <svg
            className="w-5 h-5 text-rose-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
      );
    }

    if (type === "success") {
      return (
        <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
          <svg
            className="w-5 h-5 text-emerald-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      );
    }

    return (
      <div className="w-10 h-10 rounded-full bg-[#EDF2F8] border border-[#D5E1EE] flex items-center justify-center shrink-0">
        <svg
          className="w-5 h-5 text-[#17365D]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
    );
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          if (onCancel) onCancel();
          else onConfirm();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-dialog-title"
        className="w-full max-w-md bg-white rounded-lg border border-[#E4E7EC] shadow-xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5">
          <div className="flex items-start gap-3.5">
            {renderIcon()}
            <div className="flex-1 min-w-0 pt-0.5">
              <h3
                id="app-dialog-title"
                className="text-base font-semibold text-[#17365D] tracking-tight leading-snug"
              >
                {title}
              </h3>
              <div className="mt-1.5 text-xs text-[#475467] leading-relaxed break-words whitespace-pre-wrap">
                {message}
              </div>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="bg-[#F9FAFB] border-t border-[#E4E7EC] px-5 py-3 flex items-center justify-end gap-2.5">
          {isConfirmDialog && (
            <button
              type="button"
              onClick={onCancel}
              className="h-8.5 px-3.5 text-xs font-semibold text-[#344054] bg-white border border-[#D0D5DD] hover:bg-[#F2F4F7] rounded-md transition-colors cursor-pointer shadow-2xs"
            >
              {cancelText}
            </button>
          )}

          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            className={`h-8.5 px-4 text-xs font-semibold text-white rounded-md transition-colors cursor-pointer shadow-xs ${
              isDestructive
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-[#17365D] hover:bg-[#112B4B]"
            }`}
          >
            {finalConfirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

