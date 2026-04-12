import { pool } from "../db/pool.js";
import { SETTINGS_ROW_ID } from "../constants/appConstants.js";

export const settingsRepository = {
  async findCurrent(connection = pool) {
    const [rows] = await connection.query(
      `SELECT *
       FROM settings
       WHERE id = ?
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        app_name = VALUES(app_name),
        theme = VALUES(theme),
        language = VALUES(language),
        currency_code = VALUES(currency_code),
        currency_symbol = VALUES(currency_symbol),
        items_per_page = VALUES(items_per_page),
        notifications_enabled = VALUES(notifications_enabled),
        due_soon_days = VALUES(due_soon_days),
        default_interest_type = VALUES(default_interest_type),
        default_interest_rate = VALUES(default_interest_rate),
        default_grace_period_days = VALUES(default_grace_period_days),
        hide_sensitive_info = VALUES(hide_sensitive_info),
        dashboard_layout = VALUES(dashboard_layout)`,
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
