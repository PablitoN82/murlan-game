import assert from "node:assert/strict";
import test from "node:test";
import { isValidRoomCode, makeRoomCode, normalizePlayerName, normalizeRoomCode } from "./room-security";

test("genera codici stanza nel formato sicuro a sei caratteri", () => {
  for (let index = 0; index < 100; index += 1) {
    assert.match(makeRoomCode(), /^MURLAN-[A-HJ-NP-Z2-9]{6}$/);
  }
});

test("normalizza e valida il codice stanza", () => {
  assert.equal(normalizeRoomCode("  murlan-ab23cd "), "MURLAN-AB23CD");
  assert.equal(isValidRoomCode("MURLAN-AB23CD"), true);
  assert.equal(isValidRoomCode("REGNO-AB12"), false);
  assert.equal(isValidRoomCode("REGNO-ABIO01"), false);
});

test("ripulisce il nome del giocatore", () => {
  assert.equal(normalizePlayerName("  Paolo \n  Reale\u0000  "), "Paolo Reale");
  assert.equal(normalizePlayerName("123456789012345678901"), "123456789012345678");
});
