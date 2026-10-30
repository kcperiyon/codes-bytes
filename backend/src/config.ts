export const DIRECT_RATE_BP = 2000; // 20% — partner's own link, or associate's own link
export const OVERRIDE_RATE_BP = 500; // 5% — partner override on their associate's sales

export const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
export const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:4500";
export const BOOTSTRAP_ADMIN_EMAILS = (process.env.BOOTSTRAP_ADMIN_EMAILS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
