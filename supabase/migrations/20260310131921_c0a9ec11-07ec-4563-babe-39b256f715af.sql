
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id::text
          AND role = _role
          AND auth.uid() IS NOT NULL
    )
$$;

CREATE OR REPLACE FUNCTION public.get_user_facility_id(_user_id UUID)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT facility_id::text
    FROM public.user_roles
    WHERE user_id = _user_id::text
      AND auth.uid() IS NOT NULL
    LIMIT 1
$$;

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
        WHERE user_id = _user_id::text
          AND facility_id = _facility_id
          AND auth.uid() IS NOT NULL
    )
$$;

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
        WHERE user_id = _user_id::text
          AND facility_id = _facility_id
          AND role = 'facility_admin'
          AND auth.uid() IS NOT NULL
    )
$$;
