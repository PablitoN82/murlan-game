const roomAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const ROOM_CODE_PATTERN = /^(?:MURLAN|REGNO)-[A-HJ-NP-Z2-9]{6}$/;

export function normalizeRoomCode(value: string | undefined) {
  return value?.trim().toUpperCase() ?? "";
}

export function isValidRoomCode(value: string) {
  return ROOM_CODE_PATTERN.test(value);
}

export function makeRoomCode() {
  const random = new Uint8Array(6);
  crypto.getRandomValues(random);
  let value = "MURLAN-";
  for (const byte of random) value += roomAlphabet[byte % roomAlphabet.length];
  return value;
}

export function normalizePlayerName(value: string | undefined) {
  return (value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 18);
}
