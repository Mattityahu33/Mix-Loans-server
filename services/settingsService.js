import { settingsRepository } from "../repositories/settingsRepository.js";
import { SETTINGS_ROW_ID } from "../constants/appConstants.js";

const defaultSettings = {
  id: SETTINGS_ROW_ID,
  app_name: "Mix Loans",
  theme: "light",
  language: "en",
  currency_code: "ZMW",
  currency_symbol: "K",
  items_per_page: 10,
  notifications_enabled: true,
  due_soon_days: 7,
  default_interest_type: "flat",
  default_interest_rate: 0,
  default_grace_period_days: 0,
  hide_sensitive_info: false,
  dashboard_layout: "default",
};

const normalizeForUi = (settings) => ({
  ...settings,
  currency_format: settings.currency_code,
  default_loan_amount: 0,
  default_interest_type: settings.default_interest_type === "reducing_balance" ? "Monthly" : "Monthly",
  default_grace_period: settings.default_grace_period_days,
  due_soon_threshold_days: settings.due_soon_days,
  total_capital_available: 0,
  penalty_rate_per_day: 0,
  allow_multiple_open_loans: true,
});

export const settingsService = {
  async getCurrent(connection) {
    const current = await settingsRepository.findCurrent(connection);
    if (current) {
      return normalizeForUi(current);
    }

    await settingsRepository.upsert(defaultSettings, connection);
    const created = await settingsRepository.findCurrent(connection);
    return normalizeForUi(created);
  },

  async update(input, connection) {
    const current = await this.getCurrent(connection);
    const next = {
      ...current,
      ...input,
      currency_code: input.currency_format ?? current.currency_code,
      due_soon_days: input.due_soon_threshold_days ?? current.due_soon_days,
      default_grace_period_days: input.default_grace_period ?? current.default_grace_period_days,
      default_interest_type:
        input.default_interest_type === "Weekly" || input.default_interest_type === "Monthly"
          ? "flat"
          : input.default_interest_type ?? current.default_interest_type,
    };
    await settingsRepository.upsert(next, connection);
    const updated = await settingsRepository.findCurrent(connection);
    return normalizeForUi(updated);
  },
};
