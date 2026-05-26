import { createHmac } from "crypto";

const HMAC_SECRET = "course-site-admin-v1";

export function generateAdminToken(password: string): string {
  return createHmac("sha256", HMAC_SECRET).update(password).digest("hex");
}

export function verifyAdminToken(token: string): boolean {
  if (!process.env.ADMIN_PASSWORD) return false;
  const expected = generateAdminToken(process.env.ADMIN_PASSWORD);
  return token === expected;
}

export function getTokenFromRequest(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7);
}
