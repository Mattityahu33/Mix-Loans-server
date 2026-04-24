import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const API_BASE_URL = String(process.env.PARITY_API_BASE_URL || process.env.API_BASE_URL || "http://localhost:5000").replace(/\/+$/, "");
const WRITE_MODE = String(process.env.PARITY_WRITE || "false").toLowerCase() === "true";

const adminIdentity =
  process.env.PARITY_ADMIN_USERNAME ||
  process.env.PARITY_ADMIN_EMAIL ||
  process.env.ADMIN_USERNAME ||
  process.env.ADMIN_EMAIL;
const adminPassword = process.env.PARITY_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

if (!adminIdentity || !adminPassword) {
  console.error("Parity check requires admin credentials via PARITY_ADMIN_* or ADMIN_* env vars.");
  process.exit(1);
}

const toQueryString = (query = {}) => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.append(key, String(value));
  });
  const rendered = params.toString();
  return rendered ? `?${rendered}` : "";
};

const request = async (method, route, { token, query, body } = {}) => {
  const url = `${API_BASE_URL}${route}${toQueryString(query)}`;
  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (error) {
    throw new Error(`Non-JSON response for ${method} ${route}: ${response.status}`);
  }

  if (!response.ok || payload?.success !== true) {
    const message = payload?.message || `Request failed (${response.status})`;
    throw new Error(`${method} ${route} -> ${message}`);
  }

  return payload.data;
};

const nowToken = Date.now();
const randomPhone = () => `+26097${String(Date.now()).slice(-7)}${Math.floor(Math.random() * 9)}`;

const run = async () => {
  console.log(`API base URL: ${API_BASE_URL}`);
  console.log(`Write mode: ${WRITE_MODE ? "enabled" : "disabled"}`);

  await request("GET", "/");
  console.log("PASS: health route");

  const auth = await request("POST", "/api/auth/login", {
    body: {
      email: adminIdentity,
      username: adminIdentity,
      password: adminPassword,
    },
  });

  if (!auth?.token) {
    throw new Error("Login did not return token");
  }

  const token = auth.token;
  console.log("PASS: login");

  await request("GET", "/api/clients", { token, query: { search: "" } });
  await request("GET", "/api/loans", { token, query: { search: "" } });
  await request("GET", "/api/loans/overdue", { token });
  await request("GET", "/api/collateral", { token, query: { search: "" } });
  await request("GET", "/api/payments", { token, query: { search: "" } });
  await request("GET", "/api/notifications", { token, query: { status: "unread" } });
  await request("GET", "/api/dashboard/stats", { token });
  await request("GET", "/api/dashboard/alerts", { token });
  await request("GET", "/api/dashboard/reports", { token });

  const currentSettings = await request("GET", "/api/settings", { token });
  await request("PUT", "/api/settings", {
    token,
    body: {
      app_name: currentSettings.app_name,
      theme: currentSettings.theme,
      language: currentSettings.language,
      currency_format: currentSettings.currency_format || currentSettings.currency_code,
      currency_code: currentSettings.currency_code,
      currency_symbol: currentSettings.currency_symbol,
      items_per_page: Number(currentSettings.items_per_page),
      due_soon_threshold_days: Number(currentSettings.due_soon_threshold_days || currentSettings.due_soon_days),
      due_soon_days: Number(currentSettings.due_soon_days || currentSettings.due_soon_threshold_days),
      default_interest_type: currentSettings.default_interest_type,
      default_interest_rate: Number(currentSettings.default_interest_rate || 0),
      default_grace_period: Number(currentSettings.default_grace_period || currentSettings.default_grace_period_days || 0),
      default_grace_period_days: Number(currentSettings.default_grace_period_days || currentSettings.default_grace_period || 0),
      dashboard_layout: currentSettings.dashboard_layout,
    },
  });

  console.log("PASS: read endpoints + settings get/update");

  if (!WRITE_MODE) {
    console.log("Write checks skipped. Set PARITY_WRITE=true to run create/update/delete flow checks.");
    return;
  }

  const createdIds = {};

  const clientA = await request("POST", "/api/clients", {
    token,
    body: {
      name: `Parity Client ${nowToken}`,
      phone: randomPhone(),
      email: `parity.${nowToken}@example.com`,
      id_number: `PAR-${nowToken}`,
      address: "Lusaka",
      risk_level: "Medium",
      notes: "Parity flow client A",
    },
  });
  createdIds.clientA = clientA.id;

  await request("PUT", `/api/clients/${clientA.id}`, {
    token,
    body: {
      notes: "Parity flow client A (updated)",
    },
  });
  await request("GET", `/api/clients/${clientA.id}`, { token });
  await request("GET", `/api/clients/${clientA.id}/loans`, { token });

  const clientB = await request("POST", "/api/clients", {
    token,
    body: {
      name: `Parity Disposable ${nowToken}`,
      phone: randomPhone(),
      risk_level: "Low",
    },
  });
  await request("DELETE", `/api/clients/${clientB.id}`, { token });
  console.log("PASS: clients CRUD");

  await request("POST", "/api/loans/quote", {
    token,
    body: {
      amount: 1000,
      interest_rate: 10,
      interest_type: "Monthly",
      duration: 2,
      grace_period: 3,
      repayment_structure: "flat",
      start_date: "2026-04-23",
    },
  });

  const loanToDelete = await request("POST", "/api/loans", {
    token,
    body: {
      client_id: Number(clientA.id),
      amount: 1000,
      interest_rate: 10,
      interest_type: "Monthly",
      duration: 2,
      grace_period: 3,
      repayment_structure: "flat",
      start_date: "2026-04-23",
      notes: "Parity loan delete",
    },
  });

  await request("PUT", `/api/loans/${loanToDelete.id}`, {
    token,
    body: {
      notes: "Parity loan delete (updated)",
    },
  });

  await request("DELETE", `/api/loans/${loanToDelete.id}`, { token });

  const loan = await request("POST", "/api/loans", {
    token,
    body: {
      client_id: Number(clientA.id),
      amount: 1200,
      interest_rate: 12,
      interest_type: "Monthly",
      duration: 3,
      grace_period: 5,
      repayment_structure: "flat",
      start_date: "2026-04-23",
      notes: "Parity primary loan",
    },
  });
  createdIds.loan = loan.id;

  await request("GET", `/api/loans/${loan.id}`, { token });
  console.log("PASS: loans quote/create/update/delete/get");

  const collateral = await request("POST", "/api/collateral", {
    token,
    body: {
      loan_id: Number(loan.id),
      client_id: Number(clientA.id),
      item_type: "General",
      description: "Parity collateral",
      estimated_value: 2000,
      collateral_status: "Held",
    },
  });

  await request("PUT", `/api/collateral/${collateral.id}`, {
    token,
    body: {
      notes: "Parity collateral updated",
      collateral_status: "Returned",
    },
  });

  await request("GET", `/api/collateral/${collateral.id}`, { token });
  await request("DELETE", `/api/collateral/${collateral.id}`, { token });
  console.log("PASS: collateral CRUD");

  const payment = await request("POST", "/api/payments", {
    token,
    body: {
      loan_id: Number(loan.id),
      amount: 200,
      payment_date: "2026-04-23",
      payment_method: "bank",
      reference_number: `PARITY-${nowToken}`,
      notes: "Parity payment",
    },
  });

  await request("GET", `/api/payments/${payment.payment.id}`, { token });
  await request("GET", `/api/payments/loan/${loan.id}`, { token });
  console.log("PASS: payments create/list/get (including bank -> bank_transfer mapping)");

  await request("GET", "/api/dashboard/stats", { token });
  await request("GET", "/api/dashboard/reports", { token });
  await request("GET", "/api/notifications", { token });

  console.log("PASS: dashboard + notifications after write flow");
  console.log("Write-flow created persistent records (expected):", createdIds);
};

run().then(() => {
  console.log("Parity flow completed successfully.");
}).catch((error) => {
  console.error("Parity flow failed:", error.message);
  process.exit(1);
});
