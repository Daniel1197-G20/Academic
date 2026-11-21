-- Atomically mark a provider-verified payment successful and activate its plan.
-- This RPC is reserved for the billing Edge Function's service role client.
CREATE OR REPLACE FUNCTION public.fulfill_paystack_payment(
  p_reference TEXT,
  p_provider_transaction_id TEXT,
  p_paid_at TIMESTAMPTZ,
  p_customer_code TEXT DEFAULT NULL,
  p_subscription_code TEXT DEFAULT NULL,
  p_email_token TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payment public.payment_transactions%ROWTYPE;
  v_plan public.subscription_plans%ROWTYPE;
  v_subscription public.user_subscriptions%ROWTYPE;
  v_paid_at TIMESTAMPTZ := COALESCE(p_paid_at, CURRENT_TIMESTAMP);
  v_period_end TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_payment
  FROM public.payment_transactions
  WHERE reference = p_reference
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment reference not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_plan FROM public.subscription_plans WHERE id = v_payment.plan_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment plan not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_payment.status = 'success' THEN
    RETURN jsonb_build_object(
      'verified', true, 'status', 'success', 'reference', v_payment.reference,
      'planCode', v_plan.code, 'planName', v_plan.name, 'amount', v_payment.amount_kobo / 100.0
    );
  END IF;
  IF v_payment.status <> 'pending' THEN
    RAISE EXCEPTION 'Payment is not pending' USING ERRCODE = '23514';
  END IF;

  v_period_end := v_paid_at + CASE v_plan.interval
    WHEN 'yearly' THEN INTERVAL '1 year'
    WHEN 'annual' THEN INTERVAL '1 year'
    WHEN 'weekly' THEN INTERVAL '7 days'
    ELSE INTERVAL '1 month'
  END;

  UPDATE public.payment_transactions
  SET status = 'success', paid_at = v_paid_at,
      provider_transaction_id = p_provider_transaction_id, updated_at = CURRENT_TIMESTAMP
  WHERE id = v_payment.id;

  SELECT * INTO v_subscription
  FROM public.user_subscriptions
  WHERE user_id = v_payment.user_id
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    UPDATE public.user_subscriptions
    SET plan_id = v_payment.plan_id, status = 'active',
        current_period_start = v_paid_at, current_period_end = v_period_end,
        cancel_at_period_end = false, authorization_reference = p_reference,
        paystack_customer_code = COALESCE(p_customer_code, paystack_customer_code),
        paystack_subscription_code = COALESCE(p_subscription_code, paystack_subscription_code),
        paystack_email_token = COALESCE(p_email_token, paystack_email_token),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_subscription.id;
  ELSE
    INSERT INTO public.user_subscriptions (
      id, user_id, plan_id, status, current_period_start, current_period_end,
      cancel_at_period_end, authorization_reference, paystack_customer_code,
      paystack_subscription_code, paystack_email_token
    ) VALUES (
      'sub_' || gen_random_uuid()::text, v_payment.user_id, v_payment.plan_id, 'active',
      v_paid_at, v_period_end, false, p_reference, p_customer_code,
      p_subscription_code, p_email_token
    );
  END IF;

  RETURN jsonb_build_object(
    'verified', true, 'status', 'success', 'reference', v_payment.reference,
    'planCode', v_plan.code, 'planName', v_plan.name, 'amount', v_payment.amount_kobo / 100.0
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fulfill_paystack_payment(TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_paystack_payment(TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT)
  TO service_role;
