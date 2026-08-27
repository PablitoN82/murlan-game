import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
test("espone una PWA Murlan installabile", async () => {
  const manifest = JSON.parse(await readFile(new URL("public/manifest.webmanifest", root), "utf8"));
  assert.equal(manifest.name, "murlan-game.dev");
  assert.equal(manifest.display, "standalone");
  assert.ok(manifest.icons.length >= 2);
});
test("offre stanze, bot, squadre e link condivisibili", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  const copy = await readFile(new URL("lib/i18n.ts", root), "utf8");
  assert.match(copy, /Quante persone giocano/);
  assert.match(copy, /Copia link d.invito/);
  assert.match(copy, /Squadra Ambra/);
  assert.match(page, /Bot/);
});
test("include lobby, inviti e notifiche", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  const copy = await readFile(new URL("lib/i18n.ts", root), "utf8");
  assert.match(copy, /Lobby Murlan/);
  assert.match(copy, /Invita alla stanza/);
  assert.match(page, /Notification\.requestPermission/);
  assert.match(page, /api\/translate/);
});
test("include il regolamento Murlan 2026", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  const copy = await readFile(new URL("lib/i18n.ts", root), "utf8");
  assert.match(copy, /La prima giocata deve contenere il 3♠/);
  assert.match(copy, /Bomba/);
  assert.match(copy, /Scala Reale/);
  assert.match(copy, /Italiano/);
  assert.match(copy, /English/);
  assert.match(copy, /Español/);
  assert.match(copy, /Shqip/);
});
