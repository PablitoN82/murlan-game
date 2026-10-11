import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { accessKeys, accessRateLimits, deviceSessions } from "../../../db/schema";
import { COOKIE, digest, cookieToken, requireAccess } from "../../../lib/access";

const KEY = /^CAS-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
function clientIp(request: Request) { return request.headers.get("CF-Connecting-IP") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"; }
function keyFormat() { const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; const bytes = crypto.getRandomValues(new Uint8Array(12)); let raw = ""; for (const b of bytes) raw += chars[b % chars.length]; return `CAS-${raw.slice(0,4)}-${raw.slice(4,8)}-${raw.slice(8)}`; }
export async function GET(request: Request) { try { await requireAccess(request); return Response.json({ authorized: true }); } catch (e) { return e instanceof Response ? e : Response.json({ authorized: false }, { status: 503 }); } }
export async function POST(request: Request) {
  try {
    const db = getDb(); const ip = clientIp(request); const now = Date.now(); const [limit] = await db.select().from(accessRateLimits).where(eq(accessRateLimits.key, ip)).limit(1); const window = limit ? Date.parse(limit.windowStartedAt) : 0;
    if (limit && now - window < 15 * 60_000 && limit.attempts >= 8) return new Response("Troppi tentativi", { status: 429, headers: { "Retry-After": String(Math.ceil((15 * 60_000 - (now - window)) / 1000)) } });
    const attempts = limit && now - window < 15 * 60_000 ? limit.attempts + 1 : 1; await db.insert(accessRateLimits).values({ key: ip, attempts, windowStartedAt: new Date().toISOString() }).onConflictDoUpdate({ target: accessRateLimits.key, set: { attempts, windowStartedAt: limit && now - window < 15 * 60_000 ? limit.windowStartedAt : new Date().toISOString() } });
    const body = await request.json() as { key?: string }; const supplied = (body.key ?? "").trim().toUpperCase(); if (!KEY.test(supplied)) return Response.json({ error: "Chiave non valida." }, { status: 403 });
    const [found] = await db.select().from(accessKeys).where(and(eq(accessKeys.hash, await digest(supplied)), eq(accessKeys.active, true))).limit(1); if (!found || (found.expiresAt && Date.parse(found.expiresAt) <= now)) return Response.json({ error: "Chiave non valida." }, { status: 403 });
    const raw = crypto.randomUUID() + crypto.randomUUID(); const sessionId = crypto.randomUUID(); await db.insert(deviceSessions).values({ id: sessionId, keyId: found.id, tokenHash: await digest(raw) }); await db.update(accessKeys).set({ lastUsedAt: new Date().toISOString() }).where(eq(accessKeys.id, found.id));
    return Response.json({ authorized: true }, { headers: { "Set-Cookie": `${COOKIE}=${raw}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=31536000` } });
  } catch { return Response.json({ error: "Servizio accesso non disponibile." }, { status: 503 }); }
}
