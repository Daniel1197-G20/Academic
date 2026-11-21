-- Record and apply a provider-verified recurring subscription charge atomically.
-- The public webhook Edge Function calls this with its service-role client only.
CREATE OR REPLACE FUNCTION public.apply_paystack_renewal(
  p_reference TEXT,
  p_provider_transaction_id TEXT,
  p_amount_kobo INTEGER,
  p_currency TEXT,
  p_paid_at TIMESTAMPTZ,
  p_customer_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_subscription public.user_subscriptions%ROWTYPE;
  v_plan public.subscription_plans%ROWTYPE;
  v_paid_at TIMESTAMPTZ := COALESCE(p_paid_at, CURRENT_TIMESTAMP);
  v_period_start TIMESTAMPTZ;
  v_period_end TIMESTAMPTZ;
  v_inserted_id TEXT;
BEGIN
  IF COALESCE(p_reference, '') = '' OR COALESCE(p_customer_code, '') = '' THEN
    RAISE EXCEPTION 'Payment reference and customer code are required' USING ERRCODE = '22023';
  END IF;

  SELECT id INTO v_inserted_id
  FROM public.payment_transactions
  WHERE reference = p_reference;
  IF FOUND THEN
    RETURN jsonb_build_object('applied', false, 'duplicate', true, 'reference', p_reference);
  END IF;

  SELECT us.* INTO v_subscription
  FROM public.user_subscriptions AS us
  WHERE us.paystack_customer_code = p_customer_code
    AND us.status IN ('active', 'non_renewing', 'past_due')
  ORDER BY us.updated_at DESC
  LIMIT 1
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No subscription matches the Paystack customer' USING ERRCODE = 'P0002';
  END IF;

  SELECT sp.* INTO v_plan FROM public.subscription_plans AS sp WHERE sp.id = v_subscription.plan_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription plan not found' USING ERRCODE = 'P0002';
  END IF;
  IF p_amount_kobo <> v_plan.amount_kobo OR upper(p_currency) <> upper(v_plan.currency) THEN
    RAISE EXCEPTION 'Recurring payment does not match the subscription plan' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.payment_transactions (
    id, user_id, subscription_id, plan_id, provider, provider_transaction_id,
    reference, amount_kobo, currency, status, metadata, paid_at
  ) VALUES (
    'tx_' || COALESCE(NULLIF(p_provider_transaction_id, ''), gen_random_uuid()::text),
    v_subscription.user_id, v_subscription.id, v_subscription.plan_id, 'paystack',
    p_provider_transaction_id, p_reference, p_amount_kobo, upper(p_currency), 'success',
    jsonb_build_object('recurring', true), v_paid_at
  ) ON CONFLICT (reference) DO NOTHING
  RETURNING id INTO v_inserted_id;

  IF v_inserted_id IS NULL THEN
    RETURN jsonb_build_object('applied', false, 'duplicate', true, 'reference', p_reference);
  END IF;

  v_period_start := GREATEST(v_subscription.current_period_end, v_paid_at);
  v_period_end := v_period_start + CASE v_plan.interval
    WHEN 'weekly' THEN INTERVAL '7 days'
    WHEN 'monthly' THEN INTERVAL '1 month'
    WHEN 'quarterly' THEN INTERVAL '3 months'
    WHEN 'biannually' THEN INTERVAL '6 months'
    WHEN 'annually' THEN INTERVAL '1 year'
    WHEN 'yearly' THEN INTERVAL '1 year'
    ELSE INTERVAL '1 month'
  END;

  UPDATE public.user_subscriptions
  SET status = 'active', current_period_start = v_period_start,
      current_period_end = v_period_end, cancel_at_period_end = false,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = v_subscription.id;

  RETURN jsonb_build_object('applied', true, 'duplicate', false, 'reference', p_reference,
    'subscription_id', v_subscription.id, 'current_period_end', v_period_end);
END;
$$;

REVOKE ALL ON FUNCTION public.apply_paystack_renewal(TEXT, TEXT, INTEGER, TEXT, TIMESTAMPTZ, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_paystack_renewal(TEXT, TEXT, INTEGER, TEXT, TIMESTAMPTZ, TEXT)
  TO service_role;
