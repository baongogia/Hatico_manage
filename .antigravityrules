# AGENT DIRECTIVES: BEP MINH HIEU (Bếp Minh Hiếu) (NEXT.JS + SUPABASE)

## 1. CORE DISCIPLINE (Karpathy & Ponytail Principles)

- **Think Before Typing:** Always outline your plan and list files to modify before writing code.
- **YAGNI & Simplicity:** Write the absolute minimum code required. Do NOT introduce speculative helpers, generic abstractions, or unrequested packages.
- **Surgical Edits:** Only touch lines/files directly relevant to the prompt. Do not reformat or refactor surrounding code.
- **Zero `any` Policy:** Strict TypeScript typing. Use generated database types from `src/types/database.types.ts`. Never use `any` or `as unknown as X`.

## 2. FRONTEND CRAFTSMANSHIP (Impeccable Principles)

- **Aesthetic Direction:** Clean, modern B2B industrial palette (Zinc/Slate base, subtle warm accents). No purple neon gradients, generic AI landing layouts, or nested card-in-card patterns.
- **Information Density:** Prioritize clear technical specification tables, high-contrast typography, and scannable specs for industrial kitchen equipment.
- **UX States:** Every interactive component must handle 4 states explicitly: Loading, Empty, Error, and Success.
- **Component Anatomy:**
  - Max 200 lines per file. Split large views into domain sub-components in `src/components/features/`.
  - Server Components by default. Use `'use client'` only at the lowest leaf components that strictly need interactivity.

## 3. ARCHITECTURE & WORKFLOW (Matt Pocock Style)

- **Type-First Execution:** When implementing a feature:
  1. Define Zod schema and TypeScript interfaces in `src/types/`.
  2. Implement Server Actions with Zod validation in `src/actions/`.
  3. Build UI components consuming the action results.
- **B2B Business Logic:**
  - Product prices can be `null` (display "Liên hệ báo giá").
  - Primary conversion goal is RFQ (Request for Quote / Nhận báo giá) and lead capture, not direct retail checkout.

## 4. DESIGN SYSTEM SPECIFICATIONS (HIGH-END B2B INDUSTRIAL)

- Palette: Zinc/Slate neutrals, Steel gray accents, selective Amber/Flame primary buttons.
- Typography: Plus Jakarta Sans / Inter. Clean hierarchy, high contrast, tabular mono numbers for specs.
- Components: Sharp or subtle rounded corners (rounded-sm or rounded-md), crisp borders (border-zinc-200 dark:border-zinc-800), zero flashy shadows.
- Hero & Projects: High-impact full-width showcase sections emphasizing stainless steel craftsmanship and large-scale commercial kitchen projects.
