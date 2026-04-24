BEGIN;

INSERT INTO settings (
  id,
  app_name,
  theme,
  language,
  currency_code,
  currency_symbol,
  items_per_page,
  notifications_enabled,
  due_soon_days,
  default_interest_type,
  default_interest_rate,
  default_grace_period_days,
  hide_sensitive_info,
  dashboard_layout
)
VALUES (
  1,
  'Mix Loans',
  'light',
  'en',
  'ZMW',
  'K',
  10,
  TRUE,
  7,
  'flat',
  0.0000,
  0,
  FALSE,
  'default'
)
ON CONFLICT (id) DO NOTHING;

SELECT setval(
  pg_get_serial_sequence('settings', 'id'),
  GREATEST((SELECT COALESCE(MAX(id), 1) FROM settings), 1),
  true
);

COMMIT;
