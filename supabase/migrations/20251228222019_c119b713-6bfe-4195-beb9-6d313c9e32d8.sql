-- Create app roles enum
CREATE TYPE public.app_role AS ENUM ('facility_admin', 'staff', 'read_only');

-- Create facilities table
CREATE TABLE public.facilities (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'staff',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, facility_id)
);

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    display_name TEXT,
    email TEXT,
    facility_id UUID REFERENCES public.facilities(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create children table with facility support and soft delete
CREATE TABLE public.children (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
    created_by_user_id UUID NOT NULL,
    reg_no TEXT NOT NULL,
    name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    sex TEXT NOT NULL CHECK (sex IN ('Male', 'Female')),
    mother_name TEXT NOT NULL,
    telephone_address TEXT,
    community TEXT,
    vaccines JSONB NOT NULL DEFAULT '[]',
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by_user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (facility_id, reg_no)
);

-- Create activity_logs table
CREATE TABLE public.activity_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sync_history table for tracking sync attempts
CREATE TABLE public.sync_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    facility_id UUID REFERENCES public.facilities(id),
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
    synced_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on all tables
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_history ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Create function to get user's facility_id
CREATE OR REPLACE FUNCTION public.get_user_facility_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT facility_id
    FROM public.user_roles
    WHERE user_id = _user_id
    LIMIT 1
$$;

-- Create function to check if user has any role in a facility
CREATE OR REPLACE FUNCTION public.user_in_facility(_user_id UUID, _facility_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND facility_id = _facility_id
    )
$$;

-- Create function to check if user is facility admin
CREATE OR REPLACE FUNCTION public.is_facility_admin(_user_id UUID, _facility_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND facility_id = _facility_id
          AND role = 'facility_admin'
    )
$$;

-- RLS Policies for facilities
CREATE POLICY "Users can view their facility" ON public.facilities
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND facility_id = id)
);

CREATE POLICY "Facility admins can update their facility" ON public.facilities
FOR UPDATE USING (
    public.is_facility_admin(auth.uid(), id)
);

-- RLS Policies for user_roles
CREATE POLICY "Users can view roles in their facility" ON public.user_roles
FOR SELECT USING (
    public.user_in_facility(auth.uid(), facility_id)
);

CREATE POLICY "Facility admins can manage roles" ON public.user_roles
FOR ALL USING (
    public.is_facility_admin(auth.uid(), facility_id)
);

-- RLS Policies for profiles
CREATE POLICY "Users can view profiles in their facility" ON public.profiles
FOR SELECT USING (
    facility_id IS NULL OR public.user_in_facility(auth.uid(), facility_id)
);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS Policies for children
CREATE POLICY "Users can view children in their facility" ON public.children
FOR SELECT USING (
    public.user_in_facility(auth.uid(), facility_id)
);

CREATE POLICY "Staff and admins can insert children" ON public.children
FOR INSERT WITH CHECK (
    public.user_in_facility(auth.uid(), facility_id) AND
    NOT public.has_role(auth.uid(), 'read_only')
);

CREATE POLICY "Staff and admins can update children" ON public.children
FOR UPDATE USING (
    public.user_in_facility(auth.uid(), facility_id) AND
    NOT public.has_role(auth.uid(), 'read_only')
);

CREATE POLICY "Only facility admins can hard delete" ON public.children
FOR DELETE USING (
    public.is_facility_admin(auth.uid(), facility_id)
);

-- RLS Policies for activity_logs
CREATE POLICY "Users can view logs in their facility" ON public.activity_logs
FOR SELECT USING (
    public.user_in_facility(auth.uid(), facility_id)
);

CREATE POLICY "Users can insert logs in their facility" ON public.activity_logs
FOR INSERT WITH CHECK (
    public.user_in_facility(auth.uid(), facility_id) AND
    user_id = auth.uid()
);

-- RLS Policies for sync_history
CREATE POLICY "Users can view their own sync history" ON public.sync_history
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own sync history" ON public.sync_history
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own sync history" ON public.sync_history
FOR UPDATE USING (user_id = auth.uid());

-- Create update timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_facilities_updated_at
    BEFORE UPDATE ON public.facilities
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_children_updated_at
    BEFORE UPDATE ON public.children
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_children_facility_id ON public.children(facility_id);
CREATE INDEX idx_children_is_deleted ON public.children(is_deleted);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_facility_id ON public.user_roles(facility_id);
CREATE INDEX idx_activity_logs_facility_id ON public.activity_logs(facility_id);
CREATE INDEX idx_sync_history_user_id ON public.sync_history(user_id);