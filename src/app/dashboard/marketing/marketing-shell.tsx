"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Profile } from "@/app/actions";
import { isSalesDepartment, isMarketingDepartment } from "@/lib/report-data";
import LiveClock from "../live-clock";

export type MainDashboardView =
  | "attendance"
  | "posts"
  | "weekly"
  | "calls"
  | "summary"
  | "overview"
  | "facebook"
  | "tiktok"
  | "youtube"
  | "website"
  | "facebook_ads"
  | "tiktok_ads"
  | "leads"
  | "branches";

// Backward-compatible alias
export type MarketingSubView = MainDashboardView;

interface MarketingShellProps {
  profile: Profile;
  activeView: MainDashboardView;
  onViewChange: (view: MainDashboardView) => void;
  onReload?: () => void;
  isPending?: boolean;
  children: React.ReactNode;
}

interface NavItem {
  id: MainDashboardView;
  label: string;
  badge?: string;
  icon: (active: boolean) => React.ReactNode;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function MarketingShell({
  profile,
  activeView,
  onViewChange,
  onReload,
  isPending = false,
  children,
}: MarketingShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = profile.role === "admin";
  const isSales = isSalesDepartment(profile.department?.name);
  const isMarketing = isMarketingDepartment(profile.department?.name);

  // Group 1: Management & Core Reports (Điểm danh, Bài đăng, Tuần, Cuộc gọi, Tổng hợp)
  const managementItems: NavItem[] = [
    ...(isAdmin
      ? [
          {
            id: "attendance" as MainDashboardView,
            label: "Báo cáo điểm danh",
            icon: (active: boolean) => (
              <svg className={`w-4 h-4 ${active ? "text-emerald-600" : "text-slate-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 16l2 2 4-4" />
              </svg>
            ),
          },
        ]
      : []),
    {
      id: "posts" as MainDashboardView,
      label: "Báo cáo bài đăng",
      icon: (active: boolean) => (
        <svg className={`w-4 h-4 ${active ? "text-violet-600" : "text-slate-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
      ),
    },
    {
      id: "weekly" as MainDashboardView,
      label: "Báo cáo Marketing tuần / tháng",
      icon: (active: boolean) => (
        <svg className={`w-4 h-4 ${active ? "text-teal-600" : "text-slate-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    ...(isSales || isAdmin
      ? [
          {
            id: "calls" as MainDashboardView,
            label: "Báo cáo cuộc gọi",
            icon: (active: boolean) => (
              <svg className={`w-4 h-4 ${active ? "text-blue-600" : "text-slate-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            ),
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            id: "summary" as MainDashboardView,
            label: "Báo cáo tổng hợp",
            icon: (active: boolean) => (
              <svg className={`w-4 h-4 ${active ? "text-slate-700" : "text-slate-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            ),
          },
        ]
      : []),
  ];

  // Group 2: Marketing Channels & Campaigns & Leads
  const marketingItems: NavItem[] = [
    {
      id: "overview",
      label: "Tổng quan Marketing",
      icon: (active) => (
        <svg className={`w-4 h-4 ${active ? "text-primary" : "text-slate-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 13h4v8H3v-8zm7-6h4v14h-4V7zm7-4h4v18h-4V3z" />
        </svg>
      ),
    },
    {
      id: "leads",
      label: "Khách hàng Marketing",
      badge: "Tập trung",
      icon: (active) => (
        <svg className={`w-4 h-4 ${active ? "text-emerald-600" : "text-slate-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      id: "facebook",
      label: "Báo cáo Facebook",
      icon: (active) => (
        <svg className={`w-4 h-4 ${active ? "text-blue-600" : "text-slate-500"}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H7v-3h3V9.5C10 6.57 11.76 5 14.41 5c1.27 0 2.6.23 2.6.23v2.85h-1.47c-1.45 0-1.9.9-1.9 1.83V12h3.2l-.51 3h-2.69v6.8c4.56-.93 8-4.96 8-9.8z"/>
        </svg>
      ),
    },
    {
      id: "tiktok",
      label: "Báo cáo TikTok",
      icon: (active) => (
        <svg className={`w-4 h-4 ${active ? "text-rose-600" : "text-slate-500"}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64c.29 0 .57.04.84.11V9.32a6.34 6.34 0 00-6.19 6.34 6.34 6.34 0 0010.82 4.49 6.27 6.27 0 001.83-4.48V8.77a8.28 8.28 0 005.11 1.76V7.07c-.89-.04-1.74-.2-2.3-.38z"/>
        </svg>
      ),
    },
    {
      id: "youtube",
      label: "Báo cáo YouTube",
      icon: (active) => (
        <svg className={`w-4 h-4 ${active ? "text-red-600" : "text-slate-500"}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M21.58 7.19a2.76 2.76 0 00-1.95-1.96C17.9 4.7 12 4.7 12 4.7s-5.9 0-7.63.53a2.76 2.76 0 00-1.95 1.96C1.9 8.93 1.9 12 1.9 12s0 3.07.52 4.81c.29.98 1.07 1.75 1.95 1.96 1.73.53 7.63.53 7.63.53s5.9 0 7.63-.53a2.76 2.76 0 001.95-1.96c.52-1.74.52-4.81.52-4.81s0-3.07-.52-4.81zM9.8 15.02V8.98l5.46 3.02-5.46 3.02z"/>
        </svg>
      ),
    },
    {
      id: "website",
      label: "Báo cáo Website",
      icon: (active) => (
        <svg className={`w-4 h-4 ${active ? "text-indigo-600" : "text-slate-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      ),
    },
    {
      id: "facebook_ads",
      label: "Chiến dịch Facebook Ads",
      icon: (active) => (
        <svg className={`w-4 h-4 ${active ? "text-sky-600" : "text-slate-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        </svg>
      ),
    },
    {
      id: "tiktok_ads",
      label: "Chiến dịch TikTok Ads",
      icon: (active) => (
        <svg className={`w-4 h-4 ${active ? "text-pink-600" : "text-slate-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      id: "branches",
      label: "Báo cáo theo chi nhánh",
      icon: (active) => (
        <svg className={`w-4 h-4 ${active ? "text-amber-600" : "text-slate-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
  ];

  const navSections: NavSection[] = [
    ...(managementItems.length > 0
      ? [
          {
            title: "Điều hành & Báo cáo",
            items: managementItems,
          },
        ]
      : []),
    {
      title: "Phân hệ Marketing",
      items: marketingItems,
    },
  ];

  const handleSelectNav = (view: MainDashboardView) => {
    onViewChange(view);
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex flex-col h-[100dvh] min-h-[100dvh] overflow-hidden bg-slate-900 font-sans text-slate-800">
      {/* Background Subtle Gradient */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(15,45,89,0.3),rgba(255,255,255,0))]" />

      {/* Top Header Bar */}
      <header className="relative z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 py-2.5 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-[4px] text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <Link href="/dashboard" className="flex items-center gap-2 group">
            <Image
              src="/logo/hatico_logo.png"
              alt="Hatico Logo"
              width={140}
              height={55}
              priority
              className="h-7 sm:h-8 w-auto max-w-[130px] object-contain object-left shrink-0"
            />
            <span className="hidden sm:inline-block text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-[4px] bg-primary/10 text-primary uppercase">
              Hatico Manager
            </span>
          </Link>

          <div className="hidden lg:block border-l border-slate-200 pl-3">
            <LiveClock />
          </div>
        </div>

        {/* Right Header: Actions & User info */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onReload && (
            <button
              type="button"
              onClick={onReload}
              disabled={isPending}
              title="Tải lại dữ liệu hệ thống"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-[4px] border border-slate-200/80 transition-colors cursor-pointer disabled:opacity-50"
            >
              <svg
                className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span className="hidden sm:inline">Làm mới</span>
            </button>
          )}

          <div className="text-right text-[11px] leading-tight hidden sm:block border-l border-slate-200 pl-3">
            <p className="font-bold text-slate-900">{profile.full_name}</p>
            <p className="text-slate-500 text-[10px]">
              {profile.role === "admin"
                ? "Ban giám đốc / Admin"
                : profile.department?.name || "Nhân viên"}
            </p>
          </div>
        </div>
      </header>

      {/* Main Workspace with Sidebar */}
      <div className="relative z-10 flex flex-1 min-h-0 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 shrink-0 bg-white/95 backdrop-blur-md border-r border-slate-200/80 shadow-2xs">
          <nav className="flex-1 overflow-y-auto p-2 space-y-3">
            {navSections.map((section, sIdx) => (
              <div key={sIdx} className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1">
                  {section.title}
                </p>
                {section.items.map((item) => {
                  const active = activeView === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectNav(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-[4px] text-xs font-medium transition-all cursor-pointer text-left ${
                        active
                          ? "bg-primary text-white font-bold shadow-xs"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`shrink-0 ${active ? "text-white" : ""}`}>{item.icon(active)}</span>
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-[4px] shrink-0 ${
                            active
                              ? "bg-white/20 text-white"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="p-3 border-t border-slate-100 bg-slate-50/50">
            <div className="text-[11px] text-slate-500 leading-relaxed">
              <p className="font-semibold text-slate-700">Hatico Manager</p>
              <p className="text-[10px] text-slate-400">Dữ liệu thời gian thực</p>
            </div>
          </div>
        </aside>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative flex flex-col w-72 max-w-[80vw] bg-white h-full shadow-2xl z-10">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900">Menu Hệ thống</span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-[4px] text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto p-2 space-y-3">
                {navSections.map((section, sIdx) => (
                  <div key={sIdx} className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1">
                      {section.title}
                    </p>
                    {section.items.map((item) => {
                      const active = activeView === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectNav(item.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-[4px] text-xs font-medium cursor-pointer text-left ${
                            active
                              ? "bg-primary text-white font-bold"
                              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={active ? "text-white" : ""}>{item.icon(active)}</span>
                            <span>{item.label}</span>
                          </div>
                          {item.badge && (
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-[4px] ${
                                active
                                  ? "bg-white/20 text-white"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </nav>
            </div>
          </div>
        )}

        {/* Workspace Content Area */}
        <main className="flex-1 min-h-0 flex flex-col overflow-y-auto bg-slate-50 p-3 sm:p-5">
          <div className="w-full max-w-7xl mx-auto flex flex-col flex-1 min-h-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
