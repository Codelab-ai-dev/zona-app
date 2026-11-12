-- +goose Up
-- register_payment() set status 'partial' but left paid_at NULL, which the
-- paid_requires_date CHECK forbids, so every partial payment failed.
-- Partial payments now record the first payment time; full payments keep
-- recording the time they were completed.
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION public.register_payment(p_transaction_id uuid, p_amount numeric, p_payment_method public.finance_payment_method, p_payment_reference text DEFAULT NULL::text, p_paid_by uuid DEFAULT NULL::uuid) RETURNS public.finance_transactions
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_transaction finance_transactions%ROWTYPE;
  v_new_paid DECIMAL(10,2);
  v_new_status finance_transaction_status;
BEGIN
  -- Obtener transacción actual
  SELECT * INTO v_transaction
  FROM finance_transactions
  WHERE id = p_transaction_id
  FOR UPDATE;

  IF v_transaction IS NULL THEN
    RAISE EXCEPTION 'Transaction not found: %', p_transaction_id;
  END IF;

  IF v_transaction.status IN ('paid', 'cancelled', 'waived') THEN
    RAISE EXCEPTION 'Transaction is already %', v_transaction.status;
  END IF;

  -- Calcular nuevo monto pagado
  v_new_paid := v_transaction.amount_paid + p_amount;

  -- Determinar nuevo estado
  IF v_new_paid >= v_transaction.amount THEN
    v_new_status := 'paid';
    v_new_paid := v_transaction.amount; -- No exceder el monto
  ELSE
    v_new_status := 'partial';
  END IF;

  -- Actualizar transacción
  UPDATE finance_transactions
  SET
    amount_paid = v_new_paid,
    status = v_new_status,
    payment_method = p_payment_method,
    payment_reference = COALESCE(p_payment_reference, payment_reference),
    paid_at = CASE WHEN v_new_status = 'paid' THEN NOW() ELSE COALESCE(paid_at, NOW()) END,
    updated_by = p_paid_by,
    updated_at = NOW()
  WHERE id = p_transaction_id
  RETURNING * INTO v_transaction;

  RETURN v_transaction;
END;
$$;
-- +goose StatementEnd

-- +goose Down
-- Intentionally irreversible: the previous definition was broken.
