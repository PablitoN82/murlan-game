import { randomBytes, randomUUID, createHash } from "node:crypto";
const label = process.argv[2] || "Dispositivo principale";
const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; const bytes = randomBytes(12); let raw = ""; for (const b of bytes) raw += chars[b % chars.length];
const key = `CAS-${raw.slice(0,4)}-${raw.slice(4,8)}-${raw.slice(8)}`; const hash = createHash("sha256").update(key).digest("hex");
console.log(JSON.stringify({ id: randomUUID(), label, hash, key }, null, 2));
console.log("Inserisci hash e id nell'INSERT D1 indicato nel README; conserva la key solo in questo output.");
