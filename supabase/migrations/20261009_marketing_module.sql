-- ==============================================================================
-- MIGRATION: MODULE BÁO CÁO MARKETING - HATICO MANAGER
-- Ngày tạo: 2026-10-09
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.marketing_contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform TEXT NOT NULL CHECK (platform IN ('facebook', 'tiktok', 'youtube', 'website')),
    publish_date DATE NOT NULL,
    title TEXT NOT NULL,
    content_type TEXT NOT NULL,
    topic TEXT,
    link TEXT,
    views INTEGER NOT NULL DEFAULT 0,
    interactions INTEGER NOT NULL DEFAULT 0,
    leads_count INTEGER NOT NULL DEFAULT 0,
    consulted_count INTEGER NOT NULL DEFAULT 0,
    converted_count INTEGER NOT NULL DEFAULT 0,
    orders_count INTEGER NOT NULL DEFAULT 0,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    fanpage_name TEXT,
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    author_name TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform TEXT NOT NULL CHECK (platform IN ('facebook_ads', 'tiktok_ads')),
    name TEXT NOT NULL,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    fanpage_name TEXT,
    target_objective TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    budget NUMERIC(15, 2) NOT NULL DEFAULT 0,
    actual_cost NUMERIC(15, 2) NOT NULL DEFAULT 0,
    reach INTEGER NOT NULL DEFAULT 0,
    views INTEGER NOT NULL DEFAULT 0,
    interactions INTEGER NOT NULL DEFAULT 0,
    leads_count INTEGER NOT NULL DEFAULT 0,
    consulted_count INTEGER NOT NULL DEFAULT 0,
    converted_count INTEGER NOT NULL DEFAULT 0,
    orders_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('preparing', 'running', 'paused', 'completed')),
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marketing_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_date DATE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT,
    demand TEXT,
    source TEXT NOT NULL CHECK (source IN ('facebook_organic', 'facebook_ads', 'tiktok_organic', 'tiktok_ads', 'youtube', 'website')),
    campaign_id UUID REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    handler_branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    assigned_staff_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'consulted', 'discussing', 'converted', 'closed', 'no_demand')),
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mkt_contents_platform_date ON public.marketing_contents(platform, publish_date DESC);
CREATE INDEX IF NOT EXISTS idx_mkt_contents_branch ON public.marketing_contents(branch_id);
CREATE INDEX IF NOT EXISTS idx_mkt_campaigns_platform ON public.marketing_campaigns(platform, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_mkt_leads_phone ON public.marketing_leads(phone);
CREATE INDEX IF NOT EXISTS idx_mkt_leads_date ON public.marketing_leads(lead_date DESC);
CREATE INDEX IF NOT EXISTS idx_mkt_leads_source ON public.marketing_leads(source);
CREATE INDEX IF NOT EXISTS idx_mkt_leads_branch ON public.marketing_leads(branch_id);

ALTER TABLE public.marketing_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_leads ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Cho phép truy cập marketing_contents') THEN
        CREATE POLICY "Cho phép truy cập marketing_contents" ON public.marketing_contents
            FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Cho phép truy cập marketing_campaigns') THEN
        CREATE POLICY "Cho phép truy cập marketing_campaigns" ON public.marketing_campaigns
            FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Cho phép truy cập marketing_leads') THEN
        CREATE POLICY "Cho phép truy cập marketing_leads" ON public.marketing_leads
            FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
    END IF;
END $$;
