-- Store the confirmed Paystack test-mode plan codes for the linked billing plans.
UPDATE public.subscription_plans
SET paystack_plan_code = CASE code
  WHEN 'student' THEN 'PLN_q19fdqrmn8u3bdo'
  WHEN 'pro' THEN 'PLN_qp3prpcpfsqbz05'
  WHEN 'premium' THEN 'PLN_a2aag2da0aiso6a'
  ELSE paystack_plan_code
END,
updated_at = CURRENT_TIMESTAMP
WHERE code IN ('student', 'pro', 'premium');
