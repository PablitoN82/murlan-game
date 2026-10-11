import { and, eq, gt, isNull, or } from "drizzle-orm";
import { getDb } from "../db";
import { accessKeys, deviceSessions } from "../db/schema";
const COOKIE = "murlan_access";
async function digest(value: string) { const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return Array.from(new Uint8Array(d), b => b.toString(16).padStart(2, "0")).join(""); }
export function cookieToken(request: Request) { const match = request.headers.get("Cookie")?.match(new RegExp(`${COOKIE}=([^;]+)`)); return match?.[1] ?? ""; }
export async function requireAccess(request: Request) { const token = cookieToken(request); if (!token) throw new Response("Accesso negato", { status: 401 }); const db = getDb(); const now = new Date().toISOString(); const [session] = await db.select({ session: deviceSessions, key: accessKeys }).from(deviceSessions).innerJoin(accessKeys, eq(deviceSessions.keyId, accessKeys.id)).where(and(eq(deviceSessions.tokenHash, await digest(token)), isNull(deviceSessions.revokedAt), eq(accessKeys.active, true), or(isNull(accessKeys.expiresAt), gt(accessKeys.expiresAt, now)))).limit(1); if (!session) throw new Response("Accesso negato", { status: 403 }); await db.update(deviceSessions).set({ lastUsedAt: now }).where(eq(deviceSessions.id, session.session.id)); return session; }
export { digest, COOKIE };
