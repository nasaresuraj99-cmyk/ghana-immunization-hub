-- Add new columns to vaccine_inventory table
ALTER TABLE public.vaccine_inventory 
ADD COLUMN IF NOT EXISTS manufacturer TEXT,
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'GHS',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'available',
ADD COLUMN IF NOT EXISTS minimum_stock_level INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS critical_stock_level INTEGER DEFAULT 20;

-- Create outreach sessions table
CREATE TABLE IF NOT EXISTS public.outreach_sessions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    facility_id UUID NOT NULL REFERENCES public.facilities(id),
    session_name TEXT NOT NULL,
    session_date DATE NOT NULL,
    location TEXT,
    status TEXT NOT NULL DEFAULT 'planned',
    notes TEXT,
    created_by_user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on outreach_sessions
ALTER TABLE public.outreach_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for outreach_sessions
CREATE POLICY "Users can view outreach sessions in their facility"
ON public.outreach_sessions
FOR SELECT
USING (user_in_facility(auth.uid(), facility_id));

CREATE POLICY "Staff and admins can insert outreach sessions"
ON public.outreach_sessions
FOR INSERT
WITH CHECK (user_in_facility(auth.uid(), facility_id) AND NOT has_role(auth.uid(), 'read_only'::app_role));

CREATE POLICY "Staff and admins can update outreach sessions"
ON public.outreach_sessions
FOR UPDATE
USING (user_in_facility(auth.uid(), facility_id) AND NOT has_role(auth.uid(), 'read_only'::app_role));

CREATE POLICY "Only facility admins can delete outreach sessions"
ON public.outreach_sessions
FOR DELETE
USING (is_facility_admin(auth.uid(), facility_id));

-- Create outreach inventory allocations table
CREATE TABLE IF NOT EXISTS public.outreach_inventory_allocations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    facility_id UUID NOT NULL,
    outreach_session_id UUID NOT NULL REFERENCES public.outreach_sessions(id) ON DELETE CASCADE,
    inventory_id UUID NOT NULL REFERENCES public.vaccine_inventory(id),
    allocated_quantity INTEGER NOT NULL,
    used_quantity INTEGER NOT NULL DEFAULT 0,
    returned_quantity INTEGER NOT NULL DEFAULT 0,
    wasted_quantity INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'allocated',
    reconciled_at TIMESTAMP WITH TIME ZONE,
    reconciled_by_user_id UUID,
    notes TEXT,
    created_by_user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on outreach_inventory_allocations
ALTER TABLE public.outreach_inventory_allocations ENABLE ROW LEVEL SECURITY;

-- RLS policies for outreach_inventory_allocations
CREATE POLICY "Users can view allocations in their facility"
ON public.outreach_inventory_allocations
FOR SELECT
USING (user_in_facility(auth.uid(), facility_id));

CREATE POLICY "Staff and admins can insert allocations"
ON public.outreach_inventory_allocations
FOR INSERT
WITH CHECK (user_in_facility(auth.uid(), facility_id) AND NOT has_role(auth.uid(), 'read_only'::app_role));

CREATE POLICY "Staff and admins can update allocations"
ON public.outreach_inventory_allocations
FOR UPDATE
USING (user_in_facility(auth.uid(), facility_id) AND NOT has_role(auth.uid(), 'read_only'::app_role));

CREATE POLICY "Only facility admins can delete allocations"
ON public.outreach_inventory_allocations
FOR DELETE
USING (is_facility_admin(auth.uid(), facility_id));

-- Create wastage records table
CREATE TABLE IF NOT EXISTS public.vaccine_wastage (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    facility_id UUID NOT NULL,
    inventory_id UUID NOT NULL REFERENCES public.vaccine_inventory(id),
    quantity INTEGER NOT NULL,
    reason TEXT NOT NULL,
    wastage_type TEXT NOT NULL,
    outreach_session_id UUID REFERENCES public.outreach_sessions(id),
    notes TEXT,
    recorded_by_user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on vaccine_wastage
ALTER TABLE public.vaccine_wastage ENABLE ROW LEVEL SECURITY;

-- RLS policies for vaccine_wastage
CREATE POLICY "Users can view wastage in their facility"
ON public.vaccine_wastage
FOR SELECT
USING (user_in_facility(auth.uid(), facility_id));

CREATE POLICY "Staff and admins can insert wastage"
ON public.vaccine_wastage
FOR INSERT
WITH CHECK (user_in_facility(auth.uid(), facility_id) AND NOT has_role(auth.uid(), 'read_only'::app_role));

-- Create inventory stock settings table
CREATE TABLE IF NOT EXISTS public.inventory_stock_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    facility_id UUID NOT NULL UNIQUE REFERENCES public.facilities(id),
    default_minimum_stock INTEGER NOT NULL DEFAULT 50,
    default_critical_stock INTEGER NOT NULL DEFAULT 20,
    near_expiry_warning_days INTEGER NOT NULL DEFAULT 30,
    critical_expiry_warning_days INTEGER NOT NULL DEFAULT 7,
    vaccine_specific_settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on inventory_stock_settings
ALTER TABLE public.inventory_stock_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for inventory_stock_settings
CREATE POLICY "Users can view settings in their facility"
ON public.inventory_stock_settings
FOR SELECT
USING (user_in_facility(auth.uid(), facility_id));

CREATE POLICY "Only facility admins can manage settings"
ON public.inventory_stock_settings
FOR ALL
USING (is_facility_admin(auth.uid(), facility_id));

-- Add batch_number to inventory_transactions for audit trail
ALTER TABLE public.inventory_transactions
ADD COLUMN IF NOT EXISTS batch_number TEXT,
ADD COLUMN IF NOT EXISTS old_quantity INTEGER,
ADD COLUMN IF NOT EXISTS new_quantity INTEGER,
ADD COLUMN IF NOT EXISTS outreach_session_id UUID REFERENCES public.outreach_sessions(id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_inventory_facility_vaccine ON public.vaccine_inventory(facility_id, vaccine_name);
CREATE INDEX IF NOT EXISTS idx_inventory_expiry ON public.vaccine_inventory(expiry_date);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON public.vaccine_inventory(status);
CREATE INDEX IF NOT EXISTS idx_transactions_facility ON public.inventory_transactions(facility_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON public.inventory_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_outreach_sessions_facility ON public.outreach_sessions(facility_id);
CREATE INDEX IF NOT EXISTS idx_outreach_allocations_session ON public.outreach_inventory_allocations(outreach_session_id);
CREATE INDEX IF NOT EXISTS idx_wastage_facility ON public.vaccine_wastage(facility_id);

-- Create trigger to update inventory status based on quantity and expiry
CREATE OR REPLACE FUNCTION public.update_inventory_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Check expiry status
    IF NEW.expiry_date < CURRENT_DATE THEN
        NEW.status = 'expired';
    ELSIF NEW.expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN
        NEW.status = 'near-expiry';
    ELSIF NEW.quantity <= NEW.critical_stock_level THEN
        NEW.status = 'critical';
    ELSIF NEW.quantity <= NEW.minimum_stock_level THEN
        NEW.status = 'low';
    ELSIF NEW.quantity = 0 THEN
        NEW.status = 'out-of-stock';
    ELSE
        NEW.status = 'available';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for status updates
DROP TRIGGER IF EXISTS trigger_update_inventory_status ON public.vaccine_inventory;
CREATE TRIGGER trigger_update_inventory_status
BEFORE INSERT OR UPDATE ON public.vaccine_inventory
FOR EACH ROW
EXECUTE FUNCTION public.update_inventory_status();

-- Create trigger to update updated_at
CREATE TRIGGER update_outreach_sessions_updated_at
BEFORE UPDATE ON public.outreach_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_outreach_allocations_updated_at
BEFORE UPDATE ON public.outreach_inventory_allocations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inventory_settings_updated_at
BEFORE UPDATE ON public.inventory_stock_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();