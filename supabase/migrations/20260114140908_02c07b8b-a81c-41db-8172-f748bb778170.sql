-- Atomic FEFO vaccine deduction function (concurrency-safe)
CREATE OR REPLACE FUNCTION public.deduct_vaccine_fefo(
  p_facility_id UUID,
  p_vaccine_name TEXT,
  p_quantity INT,
  p_child_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_performed_by_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch RECORD;
  v_new_quantity INT;
  v_transaction_id UUID;
BEGIN
  -- Find the oldest non-expired batch with sufficient stock (FEFO)
  SELECT id, vaccine_name, batch_number, quantity, expiry_date
  INTO v_batch
  FROM vaccine_inventory
  WHERE facility_id = p_facility_id
    AND vaccine_name = p_vaccine_name
    AND quantity >= p_quantity
    AND expiry_date >= CURRENT_DATE
    AND is_active = true
  ORDER BY expiry_date ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED; -- Skip locked rows to avoid deadlocks

  -- No suitable batch found
  IF v_batch IS NULL THEN
    -- Check why: no stock at all, insufficient, or all expired
    DECLARE
      v_total_stock INT;
      v_expired_stock INT;
      v_reason TEXT;
    BEGIN
      SELECT COALESCE(SUM(quantity), 0), 
             COALESCE(SUM(CASE WHEN expiry_date < CURRENT_DATE THEN quantity ELSE 0 END), 0)
      INTO v_total_stock, v_expired_stock
      FROM vaccine_inventory
      WHERE facility_id = p_facility_id
        AND vaccine_name = p_vaccine_name
        AND is_active = true;

      IF v_total_stock = 0 THEN
        v_reason := 'no_stock';
      ELSIF v_total_stock < p_quantity THEN
        v_reason := 'insufficient_stock';
      ELSIF v_expired_stock = v_total_stock THEN
        v_reason := 'all_expired';
      ELSE
        v_reason := 'insufficient_non_expired';
      END IF;

      RETURN json_build_object(
        'success', false,
        'reason', v_reason,
        'available_stock', v_total_stock - v_expired_stock,
        'expired_stock', v_expired_stock,
        'requested_quantity', p_quantity
      );
    END;
  END IF;

  -- Calculate new quantity
  v_new_quantity := v_batch.quantity - p_quantity;

  -- Deduct from inventory
  UPDATE vaccine_inventory
  SET quantity = v_new_quantity,
      updated_at = NOW()
  WHERE id = v_batch.id
    AND quantity = v_batch.quantity; -- Optimistic lock check

  -- Check if update succeeded
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'reason', 'concurrent_modification',
      'message', 'Another process modified this batch. Please retry.'
    );
  END IF;

  -- Log the transaction
  INSERT INTO inventory_transactions (
    facility_id,
    inventory_id,
    transaction_type,
    quantity,
    old_quantity,
    new_quantity,
    batch_number,
    child_id,
    session_id,
    reason,
    performed_by_user_id
  ) VALUES (
    p_facility_id,
    v_batch.id,
    'administered',
    p_quantity,
    v_batch.quantity,
    v_new_quantity,
    v_batch.batch_number,
    p_child_id,
    p_session_id,
    'Vaccine administered via FEFO',
    p_performed_by_user_id
  )
  RETURNING id INTO v_transaction_id;

  RETURN json_build_object(
    'success', true,
    'inventory_id', v_batch.id,
    'batch_number', v_batch.batch_number,
    'expiry_date', v_batch.expiry_date,
    'old_quantity', v_batch.quantity,
    'new_quantity', v_new_quantity,
    'transaction_id', v_transaction_id
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.deduct_vaccine_fefo TO authenticated;

-- Function to get inventory status for a vaccine (for debug panel)
CREATE OR REPLACE FUNCTION public.get_vaccine_inventory_status(
  p_facility_id UUID,
  p_vaccine_name TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'vaccine_name', p_vaccine_name,
    'total_stock', COALESCE(SUM(quantity), 0),
    'available_stock', COALESCE(SUM(CASE WHEN expiry_date >= CURRENT_DATE THEN quantity ELSE 0 END), 0),
    'expired_stock', COALESCE(SUM(CASE WHEN expiry_date < CURRENT_DATE THEN quantity ELSE 0 END), 0),
    'near_expiry_stock', COALESCE(SUM(CASE WHEN expiry_date >= CURRENT_DATE AND expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN quantity ELSE 0 END), 0),
    'batch_count', COUNT(*),
    'available_batches', (
      SELECT json_agg(json_build_object(
        'id', id,
        'batch_number', batch_number,
        'quantity', quantity,
        'expiry_date', expiry_date,
        'days_until_expiry', (expiry_date - CURRENT_DATE)
      ) ORDER BY expiry_date ASC)
      FROM vaccine_inventory
      WHERE facility_id = p_facility_id
        AND vaccine_name = p_vaccine_name
        AND expiry_date >= CURRENT_DATE
        AND quantity > 0
        AND is_active = true
    )
  )
  INTO v_result
  FROM vaccine_inventory
  WHERE facility_id = p_facility_id
    AND vaccine_name = p_vaccine_name
    AND is_active = true;

  RETURN COALESCE(v_result, json_build_object(
    'vaccine_name', p_vaccine_name,
    'total_stock', 0,
    'available_stock', 0,
    'expired_stock', 0,
    'near_expiry_stock', 0,
    'batch_count', 0,
    'available_batches', NULL
  ));
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_vaccine_inventory_status TO authenticated;