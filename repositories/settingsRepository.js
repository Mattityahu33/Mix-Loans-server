import { pool } from "../db/pool.js";
import { SETTINGS_ROW_ID } from "../constants/appConstants.js";

export const settingsRepository = {
  async findCurrent(connection = pool) {
    const { rows } = await connection.query(
      `SELECT *
       FROM settings
       WHERE id = $1
       LIMIT 1`,
      [SETTINGS_ROW_ID]
    );
    return rows[0] || null;
  },

  async upsert(settings, connection = pool) {
    await connection.query(
      `INSERT INTO settings (
        id, app_name, theme, language, currency_code, currency_symbol, items_per_page,
        notifications_enabled, due_soon_days, default_interest_type, default_interest_rate,
        default_grace_period_days, hide_sensitive_info, dashboard_layout
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (id) DO UPDATE SET
        app_name = EXCLUDED.app_name,
        theme = EXCLUDED.theme,
        language = EXCLUDED.language,
        currency_code = EXCLUDED.currency_code,
        currency_symbol = EXCLUDED.currency_symbol,
        items_per_page = EXCLUDED.items_per_page,
        notifications_enabled = EXCLUDED.notifications_enabled,
        due_soon_days = EXCLUDED.due_soon_days,
        default_interest_type = EXCLUDED.default_interest_type,
        default_interest_rate = EXCLUDED.default_interest_rate,
        default_grace_period_days = EXCLUDED.default_grace_period_days,
        hide_sensitive_info = EXCLUDED.hide_sensitive_info,
        dashboard_layout = EXCLUDED.dashboard_layout,
        updated_at = CURRENT_TIMESTAMP`,
      [
        SETTINGS_ROW_ID,
        settings.app_name,
        settings.theme,
        settings.language,
        settings.currency_code,
        settings.currency_symbol,
        settings.items_per_page,
        settings.notifications_enabled,
        settings.due_soon_days,
        settings.default_interest_type,
        settings.default_interest_rate,
        settings.default_grace_period_days,
        settings.hide_sensitive_info,
        settings.dashboard_layout,
      ]
    );
  },
};
