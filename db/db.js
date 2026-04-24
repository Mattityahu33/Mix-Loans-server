import { pool } from "./pool.js";

// Legacy compatibility export for modules that may still import db.js directly.
const db = {
  query: (text, params = []) => pool.query(text, params),
};

export default db;
