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
  assert.match(page, /Quante persone giocano/);
  assert.match(page, /Copia link d.invito/);
  assert.match(page, /Squadra Ambra/);
  assert.match(page, /Bot/);
});
test("include lobby, inviti e notifiche", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(page, /Lobby Murlan/);
  assert.match(page, /Invita alla stanza/);
  assert.match(page, /Notification\.requestPermission/);
});
test("include il regolamento Murlan 2026", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(page, /La prima giocata deve contenere il 3♠/);
  assert.match(page, /Bomba/);
  assert.match(page, /Scala Reale/);
});
