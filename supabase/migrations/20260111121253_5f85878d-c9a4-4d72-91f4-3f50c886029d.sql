-- Create vaccine inventory table
CREATE TABLE public.vaccine_inventory (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    facility_id UUID NOT NULL,
    vaccine_name TEXT NOT NULL,
    batch_number TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    initial_quantity INTEGER NOT NULL,
    unit TEXT NOT NULL DEFAULT 'doses',
    expiry_date DATE NOT NULL,
    received_date DATE NOT NULL DEFAULT CURRENT_DATE,
    supplier TEXT,
    storage_location TEXT,
    temperature_requirement TEXT DEFAULT '2-8°C',
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by_user_id UUID NOT NULL,
    CONSTRAINT positive_quantity CHECK (quantity >= 0),
    CONSTRAINT positive_initial_quantity CHECK (initial_quantity > 0)
);

-- Create inventory transactions table for tracking consumption
CREATE TABLE public.inventory_transactions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    facility_id UUID NOT NULL,
    inventory_id UUID NOT NULL REFERENCES public.vaccine_inventory(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL, -- 'received', 'administered', 'wasted', 'expired', 'transferred', 'adjusted'
    quantity INTEGER NOT NULL,
    child_id UUID, -- optional, for administered vaccines
    session_id TEXT, -- optional, for outreach sessions
    reason TEXT,
    performed_by_user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_vaccine_inventory_facility ON public.vaccine_inventory(facility_id);
CREATE INDEX idx_vaccine_inventory_expiry ON public.vaccine_inventory(expiry_date);
CREATE INDEX idx_vaccine_inventory_vaccine_name ON public.vaccine_inventory(vaccine_name);
CREATE INDEX idx_inventory_transactions_facility ON public.inventory_transactions(facility_id);
CREATE INDEX idx_inventory_transactions_inventory ON public.inventory_transactions(inventory_id);
CREATE INDEX idx_inventory_transactions_date ON public.inventory_transactions(created_at);

-- Enable RLS
ALTER TABLE public.vaccine_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vaccine_inventory
CREATE POLICY "Users can view inventory in their facility"
ON public.vaccine_inventory
FOR SELECT
USING (user_in_facility(auth.uid(), facility_id));

CREATE POLICY "Staff and admins can insert inventory"
ON public.vaccine_inventory
FOR INSERT
WITH CHECK (user_in_facility(auth.uid(), facility_id) AND NOT has_role(auth.uid(), 'read_only'::app_role));

CREATE POLICY "Staff and admins can update inventory"
ON public.vaccine_inventory
FOR UPDATE
USING (user_in_facility(auth.uid(), facility_id) AND NOT has_role(auth.uid(), 'read_only'::app_role));

CREATE POLICY "Only facility admins can delete inventory"
ON public.vaccine_inventory
FOR DELETE
USING (is_facility_admin(auth.uid(), facility_id));

-- RLS Policies for inventory_transactions
CREATE POLICY "Users can view transactions in their facility"
ON public.inventory_transactions
FOR SELECT
USING (user_in_facility(auth.uid(), facility_id));

CREATE POLICY "Staff and admins can insert transactions"
ON public.inventory_transactions
FOR INSERT
WITH CHECK (user_in_facility(auth.uid(), facility_id) AND NOT has_role(auth.uid(), 'read_only'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_vaccine_inventory_updated_at
BEFORE UPDATE ON public.vaccine_inventory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();