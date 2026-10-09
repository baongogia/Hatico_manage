-- ==============================================================================
-- MIGRATION: BÁO CÁO MARKETING TUẦN / THÁNG (PERIODIC MARKETING REPORTS)
-- Ngày tạo: 2026-10-09
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.marketing_periodic_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type TEXT NOT NULL CHECK (report_type IN ('weekly', 'monthly')),
    year INTEGER NOT NULL,
    period_number INTEGER NOT NULL, -- Tuần 1-53 hoặc Tháng 1-12
    branch_id TEXT NOT NULL DEFAULT 'all',
    branch_name TEXT NOT NULL DEFAULT 'Toàn hệ thống',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    creator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    creator_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'closed')),
    closed_at TIMESTAMPTZ,
    closed_by TEXT,
    evaluation JSONB NOT NULL DEFAULT '{}'::jsonb,
    action_plan JSONB NOT NULL DEFAULT '[]'::jsonb,
    snapshot JSONB,
    history JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_periodic_report UNIQUE (report_type, year, period_number, branch_id)
);

CREATE INDEX IF NOT EXISTS idx_periodic_reports_type_period 
    ON public.marketing_periodic_reports(report_type, year DESC, period_number DESC);
CREATE INDEX IF NOT EXISTS idx_periodic_reports_branch 
    ON public.marketing_periodic_reports(branch_id);

ALTER TABLE public.marketing_periodic_reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Cho phép truy cập marketing_periodic_reports') THEN
        CREATE POLICY "Cho phép truy cập marketing_periodic_reports" ON public.marketing_periodic_reports
            FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
    END IF;
END $$;
