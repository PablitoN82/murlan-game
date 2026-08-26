import { desc, gt } from "drizzle-orm";
import { getDb } from "../../../db";
import { lobbyMessages } from "../../../db/schema";
import { isValidRoomCode, normalizePlayerName, normalizeRoomCode } from "../../../lib/room-security";

export async function GET(request: Request) {
  const since = Number(new URL(request.url).searchParams.get("since") ?? 0);
  const db = getDb();
  const rows = since > 0
    ? await db.select().from(lobbyMessages).where(gt(lobbyMessages.id, since)).orderBy(lobbyMessages.id).limit(50)
    : (await db.select().from(lobbyMessages).orderBy(desc(lobbyMessages.id)).limit(40)).reverse();
  return Response.json({ messages: rows });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { name?: string; text?: string; roomCode?: string };
    const name = normalizePlayerName(body.name); const text = body.text?.trim().replace(/\s+/g, " ").slice(0, 240) ?? "";
    const roomCode = body.roomCode ? normalizeRoomCode(body.roomCode) : null;
    if (!name || !text) return Response.json({ error: "Nome e messaggio sono obbligatori." }, { status: 400 });
    if (roomCode && !isValidRoomCode(roomCode)) return Response.json({ error: "Codice stanza non valido." }, { status: 400 });
    const db = getDb(); const [message] = await db.insert(lobbyMessages).values({ name, text, roomCode }).returning();
    return Response.json({ message });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Errore inatteso." }, { status: 400 }); }
}
