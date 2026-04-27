-- Backfill ledger from historical paid/refunded orders.
-- Note: fee rate is fixed at 20% (2000 bps) to match current default PLATFORM_FEE_RATE.
INSERT INTO payment_revenue_ledger (
  order_id,
  course_id,
  teacher_user_id,
  gross_amount,
  system_fee_amount,
  net_amount,
  system_fee_rate_bps,
  currency,
  recognized_at,
  status,
  reversed_at
)
SELECT
  o.id AS order_id,
  o.course_id,
  c.created_by AS teacher_user_id,
  o.amount AS gross_amount,
  ROUND(o.amount * 0.2, 2) AS system_fee_amount,
  ROUND(o.amount - (o.amount * 0.2), 2) AS net_amount,
  2000 AS system_fee_rate_bps,
  COALESCE(NULLIF(o.currency, ''), 'VND') AS currency,
  COALESCE(o.paid_at, o.created_at) AS recognized_at,
  CASE WHEN o.status = 'refunded' THEN 'reversed' ELSE 'recognized' END AS status,
  CASE WHEN o.status = 'refunded' THEN COALESCE(o.updated_at, o.paid_at, o.created_at) ELSE NULL END AS reversed_at
FROM payment_orders o
INNER JOIN courses c ON c.id = o.course_id
LEFT JOIN payment_revenue_ledger l ON l.order_id = o.id
WHERE l.id IS NULL
  AND o.status IN ('paid', 'refunded')
  AND o.amount > 0;
