import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { gameEvents, players, rooms } from "../../../db/schema";
import { addHuman, applyAction, publicState, startGame, waitingState, type GameState } from "../../../lib/game";
import { isValidRoomCode, makeRoomCode, normalizePlayerName, normalizeRoomCode } from "../../../lib/room-security";

async function hash(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function auth(code: string, playerId: string, token: string) {
  const db = getDb();
  const [room] = await db.select().from(rooms).where(eq(rooms.code, normalizeRoomCode(code))).limit(1);
  if (!room) throw new Error("Stanza non trovata.");
  const [player] = await db.select().from(players).where(and(eq(players.id, playerId), eq(players.roomId, room.id))).limit(1);
  if (!player || player.tokenHash !== await hash(token)) throw new Error("Sessione non valida.");
  return { db, room, player };
}
function response(room: typeof rooms.$inferSelect, player: typeof players.$inferSelect, token: string | undefined, state: GameState) {
  return Response.json({ room: { code: room.code, status: state.phase, version: room.version }, player: { id: player.id, name: player.name, seat: player.seat }, ...(token ? { token } : {}), game: publicState(state, player.seat) });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { operation?: "create" | "join"; name?: string; code?: string; humanCount?: number; botNames?: string[] };
    const name = normalizePlayerName(body.name); if (!name) return Response.json({ error: "Inserisci il tuo nome." }, { status: 400 });
    const db = getDb(); const playerId = crypto.randomUUID(); const token = crypto.randomUUID();
    if (body.operation === "create") {
      const humanCount = Math.max(1, Math.min(4, Math.floor(body.humanCount ?? 1))); let code = makeRoomCode();
      for (let i = 0; i < 5 && (await db.select({ id: rooms.id }).from(rooms).where(eq(rooms.code, code)).limit(1)).length; i++) code = makeRoomCode();
      const botNames = Array.isArray(body.botNames) ? body.botNames.slice(0, 3).map((value) => normalizePlayerName(value) || "") : [];
      const roomId = crypto.randomUUID(); const state = waitingState(humanCount, name, botNames); if (humanCount === 1) startGame(state);
      const room = { id: roomId, code, status: state.phase, state: JSON.stringify(state), version: 1 };
      const player = { id: playerId, roomId, seat: 0, name, tokenHash: await hash(token), lastSeenAt: new Date().toISOString() };
      await db.batch([db.insert(rooms).values(room), db.insert(players).values(player)]);
      return response(room as typeof rooms.$inferSelect, player as typeof players.$inferSelect, token, state);
    }
    const code = normalizeRoomCode(body.code); if (!isValidRoomCode(code)) return Response.json({ error: "Codice stanza non valido." }, { status: 400 });
    const [room] = await db.select().from(rooms).where(eq(rooms.code, code)).limit(1); if (!room) return Response.json({ error: "Stanza non trovata." }, { status: 404 });
    const state = JSON.parse(room.state) as GameState; const seat = addHuman(state, name);
    const player = { id: playerId, roomId: room.id, seat, name, tokenHash: await hash(token), lastSeenAt: new Date().toISOString() }; const version = room.version + 1;
    await db.batch([db.insert(players).values(player), db.update(rooms).set({ state: JSON.stringify(state), status: state.phase, version, updatedAt: new Date().toISOString() }).where(and(eq(rooms.id, room.id), eq(rooms.version, room.version))), db.insert(gameEvents).values({ roomId: room.id, version, actorSeat: seat, type: "join", payload: JSON.stringify({ name }) })]);
    return response({ ...room, status: state.phase, state: JSON.stringify(state), version }, player as typeof players.$inferSelect, token, state);
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Errore inatteso." }, { status: 400 }); }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url); const { db, room, player } = await auth(url.searchParams.get("code") ?? "", url.searchParams.get("playerId") ?? "", url.searchParams.get("token") ?? "");
    await db.update(players).set({ lastSeenAt: new Date().toISOString() }).where(eq(players.id, player.id));
    return response(room, player, undefined, JSON.parse(room.state) as GameState);
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Errore inatteso." }, { status: 401 }); }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as { code?: string; playerId?: string; token?: string; version?: number; action?: { type: "play" | "pass" | "new-hand"; cardIds?: string[] } };
    if (!body.code || !body.playerId || !body.token || !body.action) throw new Error("Richiesta incompleta.");
    const { db, room, player } = await auth(body.code, body.playerId, body.token); if (body.version !== room.version) return Response.json({ error: "La partita è stata aggiornata.", stale: true }, { status: 409 });
    const state = applyAction(JSON.parse(room.state) as GameState, player.seat, body.action); const version = room.version + 1;
    const updated = await db.update(rooms).set({ state: JSON.stringify(state), status: state.phase, version, updatedAt: new Date().toISOString() }).where(and(eq(rooms.id, room.id), eq(rooms.version, room.version))).returning({ id: rooms.id });
    if (!updated.length) return Response.json({ error: "La partita è stata aggiornata.", stale: true }, { status: 409 });
    await db.insert(gameEvents).values({ roomId: room.id, version, actorSeat: player.seat, type: body.action.type, payload: JSON.stringify(body.action) });
    return Response.json({ room: { code: room.code, status: state.phase, version }, player: { id: player.id, name: player.name, seat: player.seat }, game: publicState(state, player.seat) });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Errore inatteso." }, { status: 400 }); }
}
