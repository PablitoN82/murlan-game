import assert from "node:assert/strict";
import test from "node:test";
import {
  abandonGame,
  acceptNewDomain,
  acceptNextBattle,
  applyAction,
  calculateDomains,
  canAttach,
  canClose,
  classifyMeld,
  handPenalty,
  isBlockableMeld,
  logEntry,
  normalizeLegacyState,
  normalizeGameOptions,
  publicState,
  restartGame,
  startGame,
  startNextHand,
  validateCompleteMeld,
  validateNewMeld,
  waitingState,
  type Card,
  type GameState,
  type Meld,
  type Rank,
  type Suit,
} from "./game";

const card = (rank: Card["rank"], suit: Card["suit"], id = `${suit}-${rank}`): Card => ({ id, rank, suit });

test("accetta tre carte naturali consecutive dello stesso seme", () => {
  const result = validateNewMeld([card("A", "H"), card("2", "H"), card("3", "H")]);
  assert.equal(result.ok, true);
  assert.equal(result.ok && result.jokerAs, undefined);
});

test("accetta la sequenza circolare Q-K-A", () => {
  const result = validateNewMeld([card("Q", "S"), card("K", "S"), card("A", "S")]);
  assert.equal(result.ok, true);
});

test("rifiuta carte di semi diversi", () => {
  const result = validateNewMeld([card("4", "H"), card("5", "D"), card("6", "H")]);
  assert.equal(result.ok, false);
});

test("il Re Sovrano non permette di aprire con sole due carte consecutive", () => {
  const result = validateNewMeld([card("3", "H"), card("4", "H"), card("K", "H")]);
  assert.equal(result.ok, false);
});

test("accetta due naturali consecutive piÃ¹ un Jolly", () => {
  const result = validateNewMeld([card("7", "C"), card("8", "C"), card("★", "X", "X-1")], "9");
  assert.equal(result.ok, true);
});

test("accetta una combinazione lunga con un Jolly dichiarato", () => {
  const result = validateNewMeld([
    card("7", "C"),
    card("★", "X", "X-1"),
    card("9", "C"),
    card("10", "C"),
  ], "8");
  assert.equal(result.ok, true);
  assert.equal(result.ok && result.jokerAs, "8");
});

test("valida una scala estesa con Jolly nella carta mancante", () => {
  assert.equal(validateCompleteMeld([
    card("5", "S"),
    card("6", "S"),
    card("★", "X", "X-1"),
    card("8", "S"),
  ], "S", "7"), true);
});

test("una pesca sposta il turno dalla fase pesca alla fase calata", () => {
  const state = startGame(["Paolo", "Asi"]);
  const before = state.hands[0].length;
  applyAction(state, 0, "Paolo", { type: "draw-deck" });
  assert.equal(state.hands[0].length, before + 1);
  assert.deepEqual(state.collectedThisTurn, [state.hands[0].at(-1)?.id]);
  assert.equal(state.phase, "meld");
  assert.equal(state.turn, 0);
});

test("lo scarto termina il turno", () => {
  const state = startGame(["Paolo", "Asi"]);
  applyAction(state, 0, "Paolo", { type: "draw-deck" });
  const disposable = state.hands[0].find((candidate) =>
    candidate.rank !== "K"
    && state.melds[0].every((meld) => meld.suit !== candidate.suit),
  ) as Card;
  applyAction(state, 0, "Paolo", { type: "discard", cardId: disposable.id });
  assert.equal(state.turn, 1);
  assert.equal(state.phase, "draw");
});

test("la Terra d'Esilio resta attiva anche nelle vecchie configurazioni", () => {
  assert.deepEqual(normalizeGameOptions({ exileLand: false, exileEnabled: false }), {
    humbleKing: true,
    attachmentObligation: true,
  });
});

test("l'ultima carta non chiudibile resta in mano e attiva la Decisione del Fato", () => {
  const state = waitingState();
  state.phase = "meld";
  state.deck = [card("7", "D", "fate-continuity")];
  state.hands[0] = [card("8", "H", "last-card")];
  applyAction(state, 0, "Paolo", { type: "discard", cardId: "last-card" });
  assert.deepEqual(state.hands[0].map((item) => item.id), ["last-card"]);
  assert.equal(state.pendingFateDecision?.reason, "single-card-stall");
  assert.equal(state.phase, "fate-decision");
});

test("la pesca profonda raccoglie tutte le carte sovrastanti e crea un obbligo", () => {
  const state = startGame(["Paolo", "Asi"]);
  state.discard = [
    card("K", "H"),
    card("8", "D"),
    card("9", "C"),
    card("A", "H"),
    card("K", "D"),
  ];

  applyAction(state, 0, "Paolo", { type: "draw-discard", cardId: "D-8" });

  assert.deepEqual(state.discard.map((item) => item.id), ["H-K"]);
  assert.deepEqual(
    state.hands[0].slice(-4).map((item) => item.id),
    ["D-8", "C-9", "H-A", "D-K"],
  );
  assert.deepEqual(state.collectedThisTurn, ["D-8", "C-9", "H-A", "D-K"]);
  assert.equal(state.drawObligation, "D-8");
  assert.deepEqual(state.collectedThisTurn, ["D-8", "C-9", "H-A", "D-K"]);
});

test("il Re o Jolly scoperto a inizio mano puÃ² essere preso e conservato", () => {
  for (const openingCard of [card("K", "H", "opening-king"), card("★", "X", "opening-joker")]) {
    const state = waitingState();
    state.phase = "draw";
    state.deck = Array.from({ length: 39 }, (_, index) => card("6", "C", `deck-${openingCard.id}-${index}`));
    state.discard = [openingCard];
    state.hands = [
      Array.from({ length: 7 }, (_, index) => card("4", "D", `p0-${openingCard.id}-${index}`)),
      Array.from({ length: 7 }, (_, index) => card("5", "S", `p1-${openingCard.id}-${index}`)),
    ];

    applyAction(state, 0, "Paolo", { type: "draw-discard", cardId: openingCard.id });

    assert.equal(state.drawObligation, undefined);
    assert.equal(state.freeOpeningSpecialDraw, true);
    assert.equal(state.hands[0].some((item) => item.id === openingCard.id), true);
    applyAction(state, 0, "Paolo", { type: "discard", cardId: `p0-${openingCard.id}-0` });
    assert.equal(state.turn, 1);
    assert.equal(state.freeOpeningSpecialDraw, undefined);
  }
});

test("un Re comparso negli scarti dopo l'apertura deve essere usato subito", () => {
  const state = waitingState();
  state.phase = "draw";
  state.deck = Array.from({ length: 38 }, (_, index) => card("6", "C", `later-deck-${index}`));
  state.discard = [card("K", "H", "later-king")];
  state.hands = [
    Array.from({ length: 7 }, (_, index) => card("4", "D", `later-p0-${index}`)),
    Array.from({ length: 7 }, (_, index) => card("5", "S", `later-p1-${index}`)),
  ];

  applyAction(state, 0, "Paolo", { type: "draw-discard", cardId: "later-king" });

  assert.equal(state.drawObligation, "later-king");
  assert.equal(state.freeOpeningSpecialDraw, undefined);
});

test("la presa libera del Re iniziale puÃ² essere annullata", () => {
  const state = waitingState();
  state.phase = "draw";
  state.deck = Array.from({ length: 39 }, (_, index) => card("6", "C", `undo-deck-${index}`));
  state.discard = [card("K", "S", "undo-opening-king")];
  state.hands = [
    Array.from({ length: 7 }, (_, index) => card("4", "D", `undo-p0-${index}`)),
    Array.from({ length: 7 }, (_, index) => card("5", "H", `undo-p1-${index}`)),
  ];

  applyAction(state, 0, "Paolo", { type: "draw-discard", cardId: "undo-opening-king" });
  applyAction(state, 0, "Paolo", { type: "undo-draw-discard" });

  assert.equal(state.phase, "draw");
  assert.deepEqual(state.discard.map((item) => item.id), ["undo-opening-king"]);
  assert.equal(state.hands[0].length, 7);
});

test("non consente lo scarto finchÃ© la carta scelta dagli scarti non Ã¨ usata", () => {
  const state = startGame(["Paolo", "Asi"]);
  state.discard = [card("3", "H")];
  applyAction(state, 0, "Paolo", { type: "draw-discard", cardId: "H-3" });
  assert.throws(() => applyAction(state, 0, "Paolo", { type: "discard", cardId: state.hands[0][0].id }), /usare la carta scelta/);
});

test("annulla una presa dagli scarti e ripristina mano, pozzo e fase di pesca", () => {
  const state = startGame(["Paolo", "Asi"]);
  const initialHand = state.hands[0].map((card) => card.id);
  const initialDiscard = state.discard.map((card) => card.id);
  const chosen = state.discard[0];

  applyAction(state, 0, "Paolo", { type: "draw-discard", cardId: chosen.id });
  assert.equal(state.phase, "meld");
  assert.ok(state.hands[0].length > initialHand.length);

  applyAction(state, 0, "Paolo", { type: "undo-draw-discard" });

  assert.equal(state.phase, "draw");
  assert.deepEqual(state.hands[0].map((card) => card.id), initialHand);
  assert.deepEqual(state.discard.map((card) => card.id), initialDiscard);
  assert.equal(state.drawObligation, undefined);
  assert.equal(state.collectedThisTurn, undefined);
});

test("annulla una scala appena calata quando lo scarto finale non consente la chiusura", () => {
  const state = waitingState();
  state.phase = "meld";
  state.hands[0] = [
    card("A", "H"),
    card("2", "H"),
    card("3", "H"),
    card("9", "C"),
  ];

  applyAction(state, 0, "Paolo", {
    type: "meld",
    cardIds: ["H-A", "H-2", "H-3"],
  });
  assert.deepEqual(state.hands[0].map((item) => item.id), ["C-9"]);
  assert.throws(
    () => applyAction(state, 0, "Paolo", { type: "discard", cardId: "C-9" }),
    /manca una combinazione di Quadri/,
  );

  applyAction(state, 0, "Paolo", { type: "undo-table-action" });
  assert.deepEqual(state.hands[0].map((item) => item.id), ["H-A", "H-2", "H-3", "C-9"]);
  assert.equal(state.melds[0].length, 0);
  assert.equal(state.phase, "meld");
});

test("estende una scala personale", () => {
  const state = waitingState();
  state.phase = "meld";
  state.hands[0] = [card("4", "H")];
  state.melds[0] = [{ id: "m1", suit: "H", cards: [card("A", "H"), card("2", "H"), card("3", "H")] }];
  applyAction(state, 0, "Paolo", { type: "extend", meldId: "m1", cardIds: ["H-4"] });
  assert.equal(state.melds[0][0].cards.length, 4);
});

test("usa sempre il K come Re Umile per colmare il valore mancante di una scala esistente", () => {
  const state = waitingState();
  state.phase = "meld";
  state.hands[0] = [card("K", "D"), card("8", "D")];
  state.melds[0] = [{
    id: "diamonds-humble",
    suit: "D",
    cards: [card("4", "D"), card("5", "D"), card("6", "D")],
  }];

  applyAction(state, 0, "Paolo", {
    type: "extend",
    meldId: "diamonds-humble",
    cardIds: ["D-K", "D-8"],
  });

  assert.equal(state.melds[0][0].humbleAs, "7");
  assert.equal(state.melds[0][0].humbleKingId, "D-K");
  assert.deepEqual(state.melds[0][0].cards.map((item) => item.rank), ["4", "5", "6", "K", "8"]);
  assert.deepEqual(classifyMeld(state.melds[0][0]), {
    meldId: "diamonds-humble",
    name: "Scala di Re Umile",
    points: 10,
    complete: true,
  });
});

test("aggiunge il Re Sovrano a una combinazione Matta giÃ  valida", () => {
  const state = waitingState();
  state.phase = "meld";
  state.hands[0] = [card("K", "D")];
  state.melds[0] = [{
    id: "diamonds-mad",
    suit: "D",
    cards: [card("4", "D"), card("★", "X"), card("6", "D")],
    jokerAs: "5",
  }];

  applyAction(state, 0, "Paolo", { type: "extend", meldId: "diamonds-mad", cardIds: ["D-K"] });

  assert.equal(state.melds[0][0].sovereign, true);
  assert.deepEqual(classifyMeld(state.melds[0][0]), {
    meldId: "diamonds-mad",
    name: "Re Sovrano Matto",
    points: 15,
    complete: true,
  });
});

test("estende la sequenza naturale sotto un Re Sovrano fuori posizione", () => {
  const state = waitingState();
  state.phase = "meld";
  state.hands[0] = [card("6", "S")];
  state.melds[0] = [{
    id: "sovereign",
    suit: "S",
    cards: [card("3", "S"), card("4", "S"), card("5", "S"), card("K", "S")],
    sovereign: true,
  }];

  assert.equal(canAttach(state.hands[0][0], state.melds[0][0]), true);
  applyAction(state, 0, "Paolo", { type: "extend", meldId: "sovereign", cardIds: ["S-6"] });

  assert.deepEqual(state.melds[0][0].cards.map((item) => item.rank), ["3", "4", "5", "6", "K"]);
  assert.equal(state.melds[0][0].sovereign, true);
  assert.equal(state.hands[0].length, 0);
});

test("ogni nuova mano contiene esattamente 52 carte naturali e 2 Jolly senza duplicati", () => {
  for (let hand = 0; hand < 30; hand += 1) {
    const state = startGame(["Paolo", "Asi"]);
    const cards = [...state.deck, ...state.discard, ...state.hands[0], ...state.hands[1]];
    assert.equal(cards.length, 54);
    assert.equal(new Set(cards.map((item) => item.id)).size, 54);
    assert.equal(cards.filter((item) => item.rank === "★").length, 2);
  }
});

test("ripara Jolly e accenti delle stanze create prima della correzione UTF-8", () => {
  const state = waitingState();
  state.deck = [{ id: "X-1", rank: "\u00e2\u02dc\u2026" as Card["rank"], suit: "X" }];
  state.log = [{ id: "legacy", text: "Questa carta pu\u00c3\u00b2 essere agganciata. Jolly \u00e2\u02dc\u2026", at: new Date().toISOString() }];

  normalizeLegacyState(state);

  assert.equal(state.deck[0].rank, "★");
  assert.equal(state.log[0].text, "Questa carta puÃ² essere agganciata. Jolly ★");
});

test("consente una sola scala per seme a ciascun giocatore", () => {
  const state = waitingState();
  state.phase = "meld";
  state.hands[0] = [card("8", "S"), card("9", "S"), card("10", "S")];
  state.melds[0] = [{
    id: "spades",
    suit: "S",
    cards: [card("2", "S"), card("3", "S"), card("4", "S")],
  }];

  assert.throws(
    () => applyAction(state, 0, "Paolo", {
      type: "meld",
      cardIds: ["S-8", "S-9", "S-10"],
    }),
    /giÃ  una scala di Picche/,
  );
  assert.equal(state.melds[0].length, 1);
  assert.deepEqual(state.melds[0][0].cards.map((item) => item.id), ["S-2", "S-3", "S-4"]);
});

test("il Jolly recuperato non puÃ² creare una seconda scala dello stesso seme", () => {
  const state = waitingState();
  state.phase = "meld";
  state.hands[0] = [card("7", "S"), card("3", "H"), card("4", "H")];
  state.melds[0] = [{
    id: "hearts",
    suit: "H",
    cards: [card("8", "H"), card("9", "H"), card("10", "H")],
  }];
  state.melds[1] = [{
    id: "theirs",
    suit: "S",
    cards: [card("5", "S"), card("6", "S"), card("★", "X", "X-1"), card("8", "S")],
    jokerAs: "7",
  }];

  applyAction(state, 0, "Paolo", {
    type: "replace-joker",
    meldId: "theirs",
    cardIds: ["S-7"],
  });
  assert.throws(
    () => applyAction(state, 0, "Paolo", {
      type: "meld",
      cardIds: ["H-3", "H-4", "X-1"],
      jokerAs: "5",
    }),
    /giÃ  una scala di Cuori/,
  );
});

test("blocca una combinazione incompleta con un Re di altro seme", () => {
  const state = waitingState();
  state.phase = "meld";
  state.hands[0] = [card("K", "D")];
  state.melds[0] = [{ id: "mine", suit: "C", cards: [card("2", "C"), card("3", "C"), card("4", "C")] }];
  state.melds[1] = [{ id: "theirs", suit: "H", cards: [card("6", "H"), card("7", "H"), card("8", "H")] }];
  applyAction(state, 0, "Paolo", { type: "block", meldId: "theirs", cardId: "D-K" });
  assert.equal(state.melds[1][0].blockedBy?.id, "D-K");
});

test("rende vulnerabile una scala di quattro carte soltanto se contiene un Jolly", () => {
  const natural: Meld = {
    id: "natural",
    suit: "H",
    cards: [card("5", "H"), card("6", "H"), card("7", "H"), card("8", "H")],
  };
  const withJoker: Meld = {
    id: "joker",
    suit: "H",
    cards: [card("5", "H"), card("6", "H"), card("★", "X", "X-block"), card("8", "H")],
    jokerAs: "7",
  };
  assert.equal(isBlockableMeld(natural), false);
  assert.equal(isBlockableMeld(withJoker), true);
});

test("blocca una scala di quattro carte con Jolly e applica la penalitÃ ", () => {
  const state = waitingState();
  state.phase = "meld";
  state.hands[0] = [card("K", "D")];
  state.melds[0] = [{ id: "mine", suit: "C", cards: [card("2", "C"), card("3", "C"), card("4", "C")] }];
  state.melds[1] = [{
    id: "theirs",
    suit: "H",
    cards: [card("5", "H"), card("6", "H"), card("★", "X", "X-block"), card("8", "H")],
    jokerAs: "7",
  }];
  applyAction(state, 0, "Paolo", { type: "block", meldId: "theirs", cardId: "D-K" });
  assert.equal(state.melds[1][0].blockedBy?.id, "D-K");
  assert.equal(classifyMeld(state.melds[1][0]).points, -20);
});

test("non blocca quattro naturali, cinque carte o una scala con K", () => {
  assert.equal(isBlockableMeld({
    id: "four-natural",
    suit: "H",
    cards: [card("5", "H"), card("6", "H"), card("7", "H"), card("8", "H")],
  }), false);
  assert.equal(isBlockableMeld({
    id: "five-with-joker",
    suit: "H",
    cards: [card("5", "H"), card("6", "H"), card("★", "X", "X-five"), card("8", "H"), card("9", "H")],
    jokerAs: "7",
  }), false);
  assert.equal(isBlockableMeld({
    id: "with-king",
    suit: "H",
    cards: [card("Q", "H"), card("K", "H"), card("A", "H")],
  }), false);
});

test("non permette di ribloccare una scala giÃ  liberata", () => {
  const state = waitingState();
  state.phase = "meld";
  state.hands[0] = [card("K", "D")];
  state.melds[0] = [{ id: "mine", suit: "C", cards: [card("2", "C"), card("3", "C"), card("4", "C")] }];
  state.melds[1] = [{
    id: "theirs",
    suit: "H",
    cards: [card("6", "H"), card("7", "H"), card("8", "H")],
    immune: true,
  }];
  assert.throws(
    () => applyAction(state, 0, "Paolo", { type: "block", meldId: "theirs", cardId: "D-K" }),
    /non puÃ² essere bloccata/,
  );
});

test("il Re Legittimo vince il Duello, libera la scala e cattura il Re Invasore", () => {
  const state = waitingState();
  state.phase = "meld";
  state.hands[0] = [card("K", "H"), card("Q", "H")];
  state.hands[1] = [card("2", "D")];
  state.deck = [card("A", "H", "fate-legitimate"), card("K", "S", "fate-invader")];
  state.melds[0] = [{
    id: "mine",
    suit: "H",
    cards: [card("6", "H"), card("7", "H"), card("8", "H")],
    blockedBy: card("K", "D"),
  }];
  applyAction(state, 0, "Paolo", { type: "duel", meldId: "mine", cardId: "H-K", cardIds: ["H-Q"] });
  assert.equal(state.phase, "duel");
  applyAction(state, 1, "Asi", { type: "duel-response", cardId: "D-2" });
  assert.equal(state.melds[0][0].blockedBy, undefined);
  assert.equal(state.melds[0][0].immune, true);
  assert.equal(state.melds[0][0].liberatingKingId, "H-K");
  assert.equal(state.melds[0][0].capturedKingSuit, "D");
  assert.equal(state.melds[0][0].duelHistory?.length, 1);
  assert.equal(state.melds[0][0].duelHistory?.[0].outcome, "legitimate");
  assert.equal(state.melds[0][0].duelHistory?.[0].legitimateFate?.id, "fate-legitimate");
  assert.equal(state.melds[0][0].duelHistory?.[0].invaderFate?.id, "fate-invader");
  assert.deepEqual(
    classifyMeld(state.melds[0][0]),
    { meldId: "mine", name: "Re Sovrano", points: 25, complete: true },
  );
  assert.equal(state.prisoners[0].some((item) => item.id === "D-K"), true);
  assert.equal(state.hands[0].some((item) => item.id === "H-Q"), true);
  assert.equal(state.phase, "ceremony");
  applyAction(state, 0, "Paolo", { type: "acknowledge-ceremony" });
  assert.equal(state.phase, "ceremony");
  applyAction(state, 1, "Asi", { type: "acknowledge-ceremony" });
  assert.equal(state.phase, "meld");
});

test("l'Alleanza Segreta vince il Duello senza Carte del Fato e vincola il Re alleato alla Corte", () => {
  const state = waitingState();
  state.phase = "meld";
  state.hands[0] = [card("K", "H"), card("K", "C"), card("6", "S")];
  state.hands[1] = [card("A", "D")];
  state.deck = [card("2", "H", "fate-unused-one"), card("3", "D", "fate-unused-two")];
  state.melds[0] = [{
    id: "alliance-hearts",
    suit: "H",
    cards: [card("7", "H"), card("8", "H"), card("9", "H")],
    blockedBy: card("K", "D"),
  }];

  applyAction(state, 0, "Paolo", {
    type: "duel",
    meldId: "alliance-hearts",
    cardId: "H-K",
    cardIds: ["C-K"],
  });

  assert.equal(state.phase, "ceremony");
  assert.equal(state.pendingDuel, undefined);
  assert.equal(state.melds[0][0].blockedBy, undefined);
  assert.equal(state.melds[0][0].capturedKingSuit, "D");
  assert.equal(state.prisoners[0][0]?.id, "D-K");
  assert.equal(state.courtKings[0][0]?.id, "C-K");
  assert.equal(state.melds[0][0].duelHistory?.length, 1);
  assert.equal(state.melds[0][0].duelHistory?.[0].outcome, "alliance");
  assert.equal(state.melds[0][0].duelHistory?.[0].legitimateForce?.id, "C-K");
  assert.equal(state.melds[0][0].duelHistory?.[0].legitimateFate, undefined);
  assert.equal(state.melds[0][0].duelHistory?.[0].invaderFate, undefined);
  assert.equal(state.hands[0].some((item) => item.id === "C-K"), false);
  assert.deepEqual(state.deck.map((item) => item.id), ["fate-unused-one", "fate-unused-two"]);
  assert.match(state.log[0].text, /Alleanza Segreta/);
  applyAction(state, 0, "Paolo", { type: "acknowledge-ceremony" });
  applyAction(state, 1, "Asi", { type: "acknowledge-ceremony" });
  assert.equal(state.phase, "meld");
});

test("il Re Invasore vince il Duello, cattura il Legittimo e termina il turno senza scarto", () => {
  const state = waitingState();
  state.phase = "meld";
  state.hands[0] = [card("K", "H"), card("2", "C")];
  state.hands[1] = [card("Q", "D")];
  state.deck = [card("K", "C", "fate-legitimate-loss"), card("A", "D", "fate-invader-win")];
  state.melds[0] = [{
    id: "blocked-hearts",
    suit: "H",
    cards: [card("7", "H"), card("8", "H"), card("9", "H")],
    blockedBy: card("K", "D"),
  }];

  applyAction(state, 0, "Paolo", {
    type: "duel",
    meldId: "blocked-hearts",
    cardId: "H-K",
    cardIds: ["C-2"],
  });
  applyAction(state, 1, "Asi", { type: "duel-response", cardId: "D-Q" });

  assert.equal(state.melds[0][0].blockedBy?.id, "D-K");
  assert.equal(state.melds[0][0].capturedKingSuit, "H");
  assert.equal(state.prisoners[1][0]?.id, "H-K");
  assert.equal(state.hands[0].some((item) => item.id === "C-2"), true);
  assert.equal(state.turn, 1);
  assert.equal(state.phase, "ceremony");
  applyAction(state, 0, "Paolo", { type: "acknowledge-ceremony" });
  applyAction(state, 1, "Asi", { type: "acknowledge-ceremony" });
  assert.equal(state.phase, "draw");
});

test("la paritÃ  lascia la scala bloccata, restituisce il Re Legittimo e termina il turno", () => {
  const state = waitingState();
  state.phase = "meld";
  state.hands[0] = [card("K", "H"), card("2", "C")];
  state.hands[1] = [card("2", "S")];
  state.deck = [card("K", "C", "fate-legitimate-tie"), card("K", "S", "fate-invader-tie")];
  state.melds[0] = [{
    id: "tied-hearts",
    suit: "H",
    cards: [card("7", "H"), card("8", "H"), card("9", "H")],
    blockedBy: card("K", "D"),
  }];

  applyAction(state, 0, "Paolo", {
    type: "duel",
    meldId: "tied-hearts",
    cardId: "H-K",
    cardIds: ["C-2"],
  });
  const invaderView = publicState(state, 1);
  assert.equal(invaderView.pendingDuel?.myForceCardId, undefined);
  assert.equal(publicState(state, 0).pendingDuel?.myForceCardId, "C-2");
  applyAction(state, 1, "Asi", { type: "duel-response", cardId: "S-2" });

  assert.equal(state.melds[0][0].blockedBy?.id, "D-K");
  assert.equal(state.hands[0].some((item) => item.id === "H-K"), true);
  assert.deepEqual(state.prisoners, [[], []]);
  assert.equal(state.turn, 1);
  assert.equal(state.phase, "ceremony");
  applyAction(state, 0, "Paolo", { type: "acknowledge-ceremony" });
  applyAction(state, 1, "Asi", { type: "acknowledge-ceremony" });
  assert.equal(state.phase, "draw");
});

test("ripara una vecchia scala liberata senza confondere il Re del Duello con una Suprema", () => {
  const state = waitingState();
  state.melds[0] = [{
    id: "legacy-duel",
    suit: "D",
    cards: [card("K", "D"), card("3", "D"), card("4", "D"), card("5", "D")],
    immune: true,
  }];

  normalizeLegacyState(state);

  assert.equal(state.melds[0][0].liberatingKingId, "D-K");
  assert.deepEqual(
    classifyMeld(state.melds[0][0]),
    { meldId: "legacy-duel", name: "Re Sovrano", points: 25, complete: true },
  );
});

test("il Rito dei Tre Sigilli libera la scala, cattura il Re e termina il turno", () => {
  const state = waitingState();
  state.phase = "meld";
  state.hands[0] = [card("2", "H"), card("6", "H"), card("Q", "H"), card("4", "C")];
  state.melds[0] = [{
    id: "mine",
    suit: "H",
    cards: [card("7", "H"), card("8", "H"), card("9", "H")],
    blockedBy: card("K", "D"),
  }];
  applyAction(state, 0, "Paolo", { type: "sacrifice", meldId: "mine", cardIds: ["H-2", "H-6", "H-Q"] });
  assert.equal(state.melds[0][0].immune, true);
  assert.equal(state.melds[0][0].capturedKingSuit, "D");
  assert.equal(state.prisoners[0].some((item) => item.id === "D-K"), true);
  assert.equal(state.discard.length, 3);
  assert.deepEqual(state.discard.map((item) => item.id), ["H-2", "H-6", "H-Q"]);
  assert.equal(state.discard.at(-1)?.id, "H-Q");
  assert.equal(state.turn, 1);
  assert.equal(state.phase, "ceremony");
  applyAction(state, 0, "Paolo", { type: "acknowledge-ceremony" });
  applyAction(state, 1, "Asi", { type: "acknowledge-ceremony" });
  assert.equal(state.phase, "draw");
});

test("sostituisce un Jolly avversario e lo aggancia nello stesso turno a una scala esistente", () => {
  const state = waitingState();
  state.phase = "meld";
  state.hands[0] = [card("7", "S")];
  state.melds[0] = [{
    id: "mine",
    suit: "H",
    cards: [card("10", "H"), card("J", "H"), card("Q", "H")],
  }];
  state.melds[1] = [{
    id: "theirs",
    suit: "S",
    cards: [card("5", "S"), card("6", "S"), card("★", "X", "X-1"), card("8", "S")],
    jokerAs: "7",
  }];
  applyAction(state, 0, "Paolo", {
    type: "replace-joker",
    meldId: "theirs",
    cardIds: ["S-7"],
  });
  assert.equal(state.melds[1][0].cards.some((item) => item.id === "S-7"), true);
  assert.equal(state.hands[0].some((item) => item.rank === "★"), true);
  assert.equal(state.jokerObligation, "X-1");

  applyAction(state, 0, "Paolo", {
    type: "extend",
    meldId: "mine",
    cardIds: ["X-1"],
    jokerAs: "K",
  });
  assert.equal(state.melds[0][0].jokerAs, "K");
  assert.equal(state.jokerObligation, undefined);
});

test("sostituisce anche un Jolly nella propria scala senza bloccare il turno", () => {
  const state = waitingState();
  state.phase = "meld";
  state.hands[0] = [card("9", "H"), card("4", "D")];
  state.melds[0] = [{
    id: "my-hearts",
    suit: "H",
    cards: [card("6", "H"), card("7", "H"), card("8", "H"), card("★", "X", "X-1"), card("10", "H")],
    jokerAs: "9",
  }];

  applyAction(state, 0, "Paolo", {
    type: "replace-joker",
    meldId: "my-hearts",
    cardIds: ["H-9"],
  });

  assert.equal(state.melds[0][0].cards.some((item) => item.id === "H-9"), true);
  assert.equal(state.melds[0][0].jokerAs, undefined);
  assert.equal(state.hands[0].some((item) => item.id === "X-1"), true);
  assert.equal(state.jokerObligation, "X-1");
});

test("non sostituisce il Jolly finchÃ© la scala Ã¨ bloccata", () => {
  const state = waitingState();
  state.phase = "meld";
  state.hands[0] = [card("K", "H")];
  state.melds[0] = [{
    id: "blocked-joker",
    suit: "H",
    cards: [card("Q", "H"), card("★", "X", "X-blocked"), card("A", "H")],
    jokerAs: "K",
    blockedBy: card("K", "C"),
  }];
  assert.throws(
    () => applyAction(state, 0, "Paolo", {
      type: "replace-joker",
      meldId: "blocked-joker",
      cardIds: ["H-K"],
    }),
    /prima devi liberarla/,
  );
});

test("il Jolly recuperato trova automaticamente una posizione valida nella scala scelta", () => {
  const state = waitingState();
  state.phase = "meld";
  state.hands[0] = [card("★", "X", "X-1")];
  state.drawObligation = "X-1";
  state.obligationSource = "joker";
  state.melds[0] = [{
    id: "hearts",
    suit: "H",
    cards: [card("6", "H"), card("7", "H"), card("8", "H"), card("9", "H"), card("10", "H")],
  }];

  applyAction(state, 0, "Paolo", {
    type: "extend",
    meldId: "hearts",
    cardIds: ["X-1"],
    jokerAs: "A",
  });

  assert.equal(state.melds[0][0].jokerAs, "5");
  assert.equal(state.hands[0].length, 0);
  assert.equal(state.drawObligation, undefined);
});

test("consente azioni intermedie dopo una pesca multipla dagli scarti", () => {
  const state = waitingState();
  state.phase = "draw";
  state.discard = [card("K", "D"), card("3", "H"), card("9", "C")];
  state.hands[0] = [card("5", "C"), card("6", "C"), card("7", "C")];
  state.melds[0] = [{
    id: "hearts",
    suit: "H",
    cards: [card("K", "H"), card("A", "H"), card("2", "H")],
  }];

  applyAction(state, 0, "Paolo", { type: "draw-discard", cardId: "H-3" });
  applyAction(state, 0, "Paolo", { type: "meld", cardIds: ["C-5", "C-6", "C-7"] });
  assert.equal(state.drawObligation, "H-3");

  applyAction(state, 0, "Paolo", { type: "extend", meldId: "hearts", cardIds: ["H-3"] });
  assert.equal(state.drawObligation, undefined);
});

test("dopo il Duello estende la sequenza naturale ignorando il Re speciale", () => {
  const state = waitingState();
  state.phase = "meld";
  state.hands[0] = [card("8", "S"), card("9", "S")];
  state.melds[0] = [{
    id: "liberated",
    suit: "S",
    cards: [card("5", "S"), card("6", "S"), card("7", "S"), card("K", "S")],
    immune: true,
  }];

  applyAction(state, 0, "Paolo", { type: "extend", meldId: "liberated", cardIds: ["S-8", "S-9"] });
  assert.equal(state.melds[0][0].cards.some((item) => item.rank === "9"), true);
});

test("il Re che libera una scala non diventa parte della sequenza", () => {
  const state = waitingState();
  state.phase = "meld";
  state.hands[0] = [card("A", "S"), card("4", "D")];
  state.melds[0] = [{
    id: "liberated",
    suit: "S",
    cards: [card("5", "S"), card("6", "S"), card("7", "S"), card("8", "S"), card("9", "S"), card("K", "S")],
    immune: true,
  }];

  assert.equal(canAttach(card("A", "S"), state.melds[0][0]), false);
  assert.throws(
    () => applyAction(state, 0, "Paolo", { type: "extend", meldId: "liberated", cardIds: ["S-A"] }),
    /non proseguono questa scala/,
  );
  applyAction(state, 0, "Paolo", { type: "discard", cardId: "S-A" });
  assert.equal(state.discard.at(-1)?.id, "S-A");
  assert.equal(state.turn, 1);
});

test("una scala immune conserva il collegamento naturale K-A quando il Re non Ã¨ quello del Duello", () => {
  const meld: Meld = {
    id: "natural-immune",
    suit: "S",
    cards: [card("9", "S"), card("10", "S"), card("J", "S"), card("Q", "S"), card("K", "S")],
    immune: true,
  };

  assert.equal(canAttach(card("A", "S"), meld), true);
  assert.deepEqual(
    classifyMeld(meld),
    { meldId: "natural-immune", name: "Scala Suprema", points: 50, complete: true },
  );
});

test("il Re Sovrano del Duello entra in posizione naturale quando la scala raggiunge la Regina", () => {
  const state = waitingState();
  state.phase = "meld";
  state.hands[0] = ["6", "7", "8", "9", "10", "J", "Q", "A"]
    .map((rank) => card(rank as Card["rank"], "S"));
  state.melds[0] = [{
    id: "sovereign-spades",
    suit: "S",
    cards: [card("3", "S"), card("4", "S"), card("5", "S"), card("K", "S")],
    immune: true,
    liberatingKingId: "S-K",
  }];

  assert.equal(canAttach(card("A", "S"), state.melds[0][0]), false);
  applyAction(state, 0, "Paolo", {
    type: "extend",
    meldId: "sovereign-spades",
    cardIds: ["S-6", "S-7", "S-8", "S-9", "S-10", "S-J", "S-Q"],
  });

  assert.equal(state.melds[0][0].liberatingKingId, undefined);
  assert.deepEqual(
    classifyMeld(state.melds[0][0]),
    { meldId: "sovereign-spades", name: "Scala Suprema", points: 50, complete: true },
  );
  assert.equal(canAttach(card("A", "S"), state.melds[0][0]), true);
});

test("il Re del Duello su A-2-3 entra subito nella sequenza e crea una Suprema", () => {
  const state = waitingState();
  state.phase = "meld";
  state.hands[0] = [card("K", "S"), card("Q", "S")];
  state.hands[1] = [card("2", "D")];
  state.deck = [card("A", "S", "fate-legitimate-low"), card("K", "H", "fate-invader-low")];
  state.melds[0] = [{
    id: "low-spades",
    suit: "S",
    cards: [card("A", "S"), card("2", "S"), card("3", "S")],
    blockedBy: card("K", "D"),
  }];

  applyAction(state, 0, "Paolo", { type: "duel", meldId: "low-spades", cardId: "S-K", cardIds: ["S-Q"] });
  applyAction(state, 1, "Asi", { type: "duel-response", cardId: "D-2" });

  assert.equal(state.melds[0][0].liberatingKingId, undefined);
  assert.deepEqual(
    classifyMeld(state.melds[0][0]),
    { meldId: "low-spades", name: "Scala Suprema", points: 50, complete: true },
  );
});

test("il Re Sovrano entra in posizione naturale anche estendendo la scala verso A-2-3", () => {
  const state = waitingState();
  state.phase = "meld";
  state.hands[0] = [card("A", "S"), card("2", "S")];
  state.melds[0] = [{
    id: "reverse-spades",
    suit: "S",
    cards: [card("3", "S"), card("4", "S"), card("5", "S"), card("K", "S")],
    immune: true,
    liberatingKingId: "S-K",
  }];

  applyAction(state, 0, "Paolo", {
    type: "extend",
    meldId: "reverse-spades",
    cardIds: ["S-A", "S-2"],
  });

  assert.equal(state.melds[0][0].liberatingKingId, undefined);
  assert.deepEqual(
    classifyMeld(state.melds[0][0]),
    { meldId: "reverse-spades", name: "Scala Suprema", points: 50, complete: true },
  );
});

test("dodici carte naturali formano la Scala del Regno e concludono soltanto la mano sotto i 1.000 punti", () => {
  const state = waitingState();
  state.phase = "meld";
  state.hands[0] = [card("Q", "H")];
  state.melds[0] = [{
    id: "hearts",
    suit: "H",
    cards: ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J"].map((rank) => card(rank as Card["rank"], "H")),
  }];

  applyAction(state, 0, "Paolo", { type: "extend", meldId: "hearts", cardIds: ["H-Q"] });
  assert.equal(state.phase, "hand-ended");
  assert.equal(state.winner, undefined);
  assert.equal(state.absoluteConquestSuit, "H");
  assert.equal(state.absoluteConquestCardCount, 12);
  assert.equal(state.handResult?.conquestPoints, 500);
  assert.deepEqual(state.handResult?.handScores, [500, 0]);
  assert.deepEqual(state.scores, [500, 0]);
  assert.match(state.log[0].text, /Scala del Regno di Cuori/);
  assert.match(state.log[0].text, /vittoria immediata della mano/);
  const nextHand = startNextHand(state, ["Paolo", "Asi"]);
  assert.deepEqual(nextHand.scores, [500, 0]);
  assert.equal(nextHand.handNumber, 2);
});

test("la Scala del Regno 12 su 13 termina il match quando porta il totale ad almeno 1.000 punti", () => {
  const state = waitingState();
  state.phase = "meld";
  state.scores = [600, 1080];
  state.hands[0] = [card("4", "H")];
  state.melds[0] = [{
    id: "liberated-hearts",
    suit: "H",
    cards: ["6", "7", "8", "9", "10", "J", "Q", "K", "A", "2", "3"]
      .map((rank) => card(rank as Card["rank"], "H")),
    immune: true,
  }];

  applyAction(state, 0, "Paolo", { type: "extend", meldId: "liberated-hearts", cardIds: ["H-4"] });

  assert.equal(state.phase, "game-ended");
  assert.equal(state.winner, 0);
  assert.equal(state.absoluteConquestSuit, "H");
  assert.equal(state.absoluteConquestCardCount, 12);
  assert.equal(state.handResult?.conquestPoints, 500);
  assert.deepEqual(state.handResult?.handScores, [500, 0]);
  assert.deepEqual(state.scores, [1100, 1080]);
  assert.match(state.log[0].text, /Scala del Regno di Cuori/);
});

test("ricostruisce il premio speciale da 500 per una conquista giÃ  salvata", () => {
  const state = waitingState();
  state.phase = "game-ended";
  state.winner = 0;
  state.scores = [900, 100];
  state.hands[1] = [card("Q", "S")];
  state.melds[0] = [{
    id: "legacy-hearts",
    suit: "H",
    cards: ["6", "7", "8", "9", "10", "J", "Q", "K", "A", "2", "3", "4"]
      .map((rank) => card(rank as Card["rank"], "H")),
    immune: true,
  }];
  state.log = [logEntry("Conquista assoluta di Cuori: 12 carte naturali su 13. La partita termina immediatamente.")];

  normalizeLegacyState(state);

  assert.equal(state.absoluteConquestSuit, "H");
  assert.equal(state.absoluteConquestCardCount, 12);
  assert.equal(state.handResult?.conquestPoints, 500);
  assert.deepEqual(state.handResult?.handScores, [500, 0]);
  assert.deepEqual(state.scores, [1400, 100]);
  assert.deepEqual(state.handResult?.totals, [1400, 100]);
  assert.equal(state.winner, 0);
  assert.equal(state.phase, "game-ended");
});

test("sostituisce il vecchio conteggio ordinario senza sommare due volte la conquista", () => {
  const state = waitingState();
  state.phase = "game-ended";
  state.winner = 0;
  state.scores = [1060, 80];
  state.melds[0] = [{
    id: "saved-hearts",
    suit: "H",
    cards: ["6", "7", "8", "9", "10", "J", "Q", "K", "A", "2", "3", "4"]
      .map((rank) => card(rank as Card["rank"], "H")),
  }];
  state.handResult = {
    closer: 0,
    melds: [[{ meldId: "saved-hearts", name: "Scala Suprema", points: 50, complete: true }], []],
    domains: [["H"], []],
    penalties: [0, 20],
    handScores: [160, -20],
    totals: [1060, 80],
  };

  normalizeLegacyState(state);

  assert.equal(state.handResult.conquestPoints, 500);
  assert.deepEqual(state.handResult.handScores, [500, 0]);
  assert.deepEqual(state.scores, [1400, 100]);
  assert.deepEqual(state.handResult.totals, [1400, 100]);
});

test("la Conquista del Regno con tredici carte assegna 1.000 punti e ignora il resto del tavolo", () => {
  const state = waitingState();
  state.phase = "meld";
  state.scores = [120, 340];
  state.hands[0] = [card("K", "H")];
  state.hands[1] = [card("★", "X", "X-1"), card("Q", "S")];
  state.melds[0] = [{
    id: "full-hearts",
    suit: "H",
    cards: ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q"]
      .map((rank) => card(rank as Card["rank"], "H")),
  }];
  state.melds[1] = [{
    id: "opponent-clubs",
    suit: "C",
    cards: [card("7", "C"), card("8", "C"), card("9", "C"), card("10", "C")],
  }];

  applyAction(state, 0, "Paolo", { type: "extend", meldId: "full-hearts", cardIds: ["H-K"] });

  assert.equal(state.phase, "game-ended");
  assert.equal(state.winner, 0);
  assert.equal(state.absoluteConquestCardCount, 13);
  assert.equal(state.handResult?.conquestPoints, 1000);
  assert.deepEqual(state.handResult?.handScores, [1000, 0]);
  assert.deepEqual(state.handResult?.penalties, [0, 0]);
  assert.deepEqual(state.handResult?.domains, [[], []]);
  assert.deepEqual(state.scores, [1120, 340]);
  assert.match(state.log[0].text, /Conquista del Regno di Cuori/);
});

test("undici carte naturali dello stesso Regno non bastano per la vittoria immediata", () => {
  const state = waitingState();
  state.phase = "meld";
  state.hands[0] = [card("J", "S"), card("7", "D")];
  state.melds[0] = [{
    id: "spades",
    suit: "S",
    cards: ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10"].map((rank) => card(rank as Card["rank"], "S")),
  }];

  applyAction(state, 0, "Paolo", { type: "extend", meldId: "spades", cardIds: ["S-J"] });
  assert.equal(state.phase, "meld");
  assert.equal(state.winner, undefined);
});

test("non permette di svuotare la mano sul tavolo senza lo scarto finale", () => {
  const opening = waitingState();
  opening.phase = "meld";
  opening.hands[0] = [card("3", "H"), card("4", "H"), card("5", "H")];
  opening.deck = Array.from({ length: 51 }, (_, index) => card("6", "C", `opening-deck-${index}`));
  assert.throws(
    () => applyAction(opening, 0, "Paolo", {
      type: "meld",
      cardIds: ["H-3", "H-4", "H-5"],
    }),
    /conservare una carta naturale per lo scarto finale/,
  );

  const extension = waitingState();
  extension.phase = "meld";
  extension.hands[0] = [card("6", "H")];
  extension.deck = Array.from({ length: 50 }, (_, index) => card("7", "D", `extension-deck-${index}`));
  extension.melds[0] = [{
    id: "hearts",
    suit: "H",
    cards: [card("3", "H"), card("4", "H"), card("5", "H")],
  }];
  assert.throws(
    () => applyAction(extension, 0, "Paolo", {
      type: "extend",
      meldId: "hearts",
      cardIds: ["H-6"],
    }),
    /conservare una carta naturale per lo scarto finale/,
  );
});

test("le carte agganciabili possono essere scartate liberamente", () => {
  const state = waitingState();
  state.phase = "meld";
  state.hands[0] = [card("5", "H"), card("8", "C")];
  state.melds[0] = [
    { id: "hearts", suit: "H", cards: [card("2", "H"), card("3", "H"), card("4", "H")] },
    { id: "clubs", suit: "C", cards: [card("9", "C"), card("10", "C"), card("J", "C")] },
  ];

  applyAction(state, 0, "Paolo", { type: "discard", cardId: "H-5" });
  assert.equal(state.discard.at(-1)?.id, "H-5");
  assert.match(state.log[0].text, /ha scartato/);
});

test("una carta utilizzabile da entrambi resta vincolata a chi la scarta", () => {
  const state = waitingState();
  state.phase = "meld";
  state.hands[0] = [card("5", "H"), card("8", "C")];
  state.melds = [
    [{ id: "hearts-0", suit: "H", cards: [card("2", "H", "0-H-2"), card("3", "H", "0-H-3"), card("4", "H", "0-H-4")] }],
    [{ id: "hearts-1", suit: "H", cards: [card("2", "H", "1-H-2"), card("3", "H", "1-H-3"), card("4", "H", "1-H-4")] }],
  ];

  applyAction(state, 0, "Paolo", { type: "discard", cardId: "H-5" });

  assert.equal(state.discard.at(-1)?.boundPlayerId, 0);
  assert.equal(state.discard.at(-1)?.bindingReason, "BOTH_SELF_PRIORITY");
});

test("il proprietario recupera singolarmente la carta vincolata e attiva la Decisione del Fato", () => {
  const state = waitingState();
  state.phase = "draw";
  state.turn = 0;
  state.deck = [card("7", "D", "replacement"), card("8", "D", "later")];
  state.discard = [
    card("2", "D", "bottom"),
    { ...card("5", "H", "claimed"), boundPlayerId: 0, bindingReason: "BOTH_SELF_PRIORITY" },
    card("9", "S", "above"),
  ];
  state.hands[0] = [card("8", "C", "hand-card")];
  state.melds[0] = [{
    id: "hearts",
    suit: "H",
    cards: [card("2", "H"), card("3", "H"), card("4", "H")],
  }];

  applyAction(state, 0, "Paolo", { type: "draw-discard", cardId: "claimed" });
  assert.deepEqual(state.discard.map((item) => item.id), ["bottom", "above"]);
  assert.equal(state.singleRecoveryCardId, "claimed");

  applyAction(state, 0, "Paolo", { type: "extend", meldId: "hearts", cardIds: ["claimed"] });

  assert.deepEqual(state.discard.map((item) => item.id), ["bottom", "above", "replacement"]);
  assert.equal(state.discard.at(-1)?.boundPlayerId, undefined);
  assert.deepEqual(state.hands[0].map((item) => item.id), ["hand-card"]);
  assert.equal(state.turn, 0);
  assert.equal(state.phase, "fate-decision");
  applyAction(state, 0, "Paolo", { type: "acknowledge-fate" });
  assert.equal(state.turn, 1);
  assert.equal(state.phase, "draw");
});

test("l'avversario raccoglie normalmente la carta contesa e quelle poste sopra", () => {
  const state = waitingState();
  state.phase = "draw";
  state.turn = 1;
  state.discard = [
    card("2", "D", "bottom"),
    { ...card("5", "H", "claimed"), boundPlayerId: 0, bindingReason: "BOTH_SELF_PRIORITY" },
    card("9", "S", "above"),
  ];

  applyAction(state, 1, "Asi", { type: "draw-discard", cardId: "claimed" });

  assert.deepEqual(state.discard.map((item) => item.id), ["bottom"]);
  assert.deepEqual(state.hands[1].slice(-2).map((item) => item.id), ["claimed", "above"]);
  assert.equal(state.singleRecoveryCardId, undefined);
});

test("annullare un recupero singolo ripristina la posizione originale", () => {
  const state = waitingState();
  state.phase = "draw";
  state.turn = 0;
  state.deck = [card("7", "D", "replacement")];
  state.discard = [
    card("2", "D", "bottom"),
    { ...card("5", "H", "claimed"), boundPlayerId: 0, bindingReason: "BOTH_SELF_PRIORITY" },
    card("9", "S", "above"),
  ];

  applyAction(state, 0, "Paolo", { type: "draw-discard", cardId: "claimed" });
  applyAction(state, 0, "Paolo", { type: "undo-draw-discard" });

  assert.deepEqual(state.discard.map((item) => item.id), ["bottom", "claimed", "above"]);
  assert.equal(state.discard[1].boundPlayerId, 0);
});

test("la carta adiacente a un Jolly libero resta agganciabile ma puÃ² essere scartata", () => {
  const state = waitingState();
  state.phase = "meld";
  state.hands[0] = [card("A", "H"), card("4", "D"), card("7", "C")];
  state.melds[0] = [{
    id: "free-joker",
    suit: "H",
    cards: [card("9", "H"), card("10", "H"), card("J", "H"), card("Q", "H"), card("★", "X")],
    jokerAs: "K",
  }];

  assert.equal(canAttach(state.hands[0][0], state.melds[0][0]), true);
  applyAction(state, 0, "Paolo", { type: "discard", cardId: "H-A" });
  assert.equal(state.discard.at(-1)?.id, "H-A");
});

test("il K richiede l'Esilio del Re, mentre il Jolly Ã¨ scartabile", () => {
  const state = waitingState();
  state.phase = "meld";
  state.hands[0] = [card("K", "H"), card("6", "D"), card("7", "S")];
  state.melds[0] = [{
    id: "hearts",
    suit: "H",
    cards: [card("10", "H"), card("J", "H"), card("Q", "H")],
  }];

  assert.throws(
    () => applyAction(state, 0, "Paolo", { type: "discard", cardId: "H-K" }),
    /non puÃ² essere scartato/,
  );

  applyAction(state, 0, "Paolo", { type: "discard", cardId: "D-6" });
  assert.equal(state.discard.at(-1)?.id, "D-6");

  const exile = waitingState();
  exile.phase = "meld";
  exile.deck = [card("7", "D", "fate")];
  exile.discard = [card("3", "S", "top")];
  exile.hands[0] = [card("K", "H"), card("K", "D")];
  applyAction(exile, 0, "Paolo", { type: "discard", cardId: "H-K" });
  assert.equal(exile.exile.at(-1)?.id, "H-K");
  assert.equal(exile.discard.at(-1)?.id, "fate");
  assert.equal(exile.phase, "fate-decision");
});

test("l'Esilio di NecessitÃ  rimuove al massimo un K anche con piÃ¹ Re", () => {
  const state = waitingState();
  state.phase = "meld";
  state.deck = [card("7", "D", "fate")];
  state.discard = [card("3", "S", "top")];
  state.hands[0] = [card("K", "H"), card("K", "D"), card("K", "C")];

  applyAction(state, 0, "Paolo", { type: "discard", cardId: "H-K" });

  assert.deepEqual(state.exile.map((item) => item.id), ["H-K"]);
  assert.deepEqual(state.hands[0].map((item) => item.id).sort(), ["C-K", "D-K"]);
  assert.equal(state.phase, "fate-decision");
});

test("con piÃ¹ K e una sola carta non-K si puÃ² esiliare un solo Re", () => {
  const state = waitingState();
  state.phase = "meld";
  state.deck = [card("7", "D", "fate")];
  state.discard = [card("3", "S", "top")];
  state.hands[0] = [card("K", "H"), card("K", "D"), card("A", "C")];

  applyAction(state, 0, "Paolo", { type: "discard", cardId: "H-K" });

  assert.deepEqual(state.exile.map((item) => item.id), ["H-K"]);
  assert.deepEqual(state.hands[0].map((item) => item.id).sort(), ["C-A", "D-K"]);
  assert.equal(state.phase, "fate-decision");
});

test("una carta utile soltanto all'avversario resta offerta e si vincola se viene rifiutata", () => {
  const state = waitingState();
  state.phase = "meld";
  state.hands[0] = [card("5", "H"), card("8", "C")];
  state.melds[1] = [{ id: "opponent-hearts", suit: "H", cards: [
    card("2", "H", "o2"), card("3", "H", "o3"), card("4", "H", "o4"),
  ] }];
  applyAction(state, 0, "Paolo", { type: "discard", cardId: "H-5" });
  assert.equal(state.discard.at(-1)?.pendingOfferPlayerId, 1);
  state.deck = [card("7", "D", "draw")];
  applyAction(state, 1, "Asi", { type: "draw-deck" });
  assert.equal(state.discard.at(-1)?.boundPlayerId, 1);
  assert.equal(state.discard.at(-1)?.bindingReason, "OPPONENT_DECLINED");
});

test("la Decisione del Fato crea una carta neutrale e richiede Accetta il Destino", () => {
  const state = waitingState();
  state.phase = "meld";
  state.deck = [card("7", "D", "fate"), card("8", "D", "later")];
  state.discard = [card("2", "D", "bottom")];
  state.hands[0] = [card("K", "H"), card("K", "D")];
  applyAction(state, 0, "Paolo", { type: "discard", cardId: "H-K" });
  assert.equal(state.pendingFateDecision?.card.id, "fate");
  assert.equal(state.discard.at(-1)?.source, "FATE_DECISION");
  assert.equal(state.discard.at(-1)?.boundPlayerId, undefined);
  assert.throws(() => applyAction(state, 0, "Paolo", { type: "draw-deck" }), /accettare il Destino/);
  applyAction(state, 0, "Paolo", { type: "acknowledge-fate" });
  assert.equal(state.turn, 1);
});

test("il Richiamo dall'Esilio sostituisce la pesca e colloca subito il K", () => {
  const state = waitingState();
  state.phase = "draw";
  state.deck = [card("7", "D", "fate"), card("8", "D", "later")];
  state.discard = [card("2", "D", "bottom")];
  state.exile = [card("K", "H", "exiled-king")];
  state.melds[0] = [{ id: "hearts", suit: "H", cards: [
    card("10", "H", "h10"), card("J", "H", "hj"), card("Q", "H", "hq"),
  ] }];
  applyAction(state, 0, "Paolo", { type: "recall-exile", cardId: "exiled-king", meldId: "hearts" });
  assert.equal(state.exile.length, 0);
  assert.equal(state.melds[0][0].cards.some((item) => item.id === "exiled-king"), true);
  assert.equal(state.phase, "fate-decision");
});

test("il Richiamo dall'Esilio convoca il Duello su una scala bloccata e, se vince, attiva il Fato", () => {
  const state = waitingState();
  state.phase = "draw";
  state.deck = [card("A", "H", "fate-legitimate"), card("K", "S", "fate-invader"), card("7", "D", "fate-after")];
  state.discard = [card("2", "D", "bottom")];
  state.exile = [card("K", "H", "exiled-king")];
  state.hands[0] = [card("★", "X", "legitimate-force")];
  state.hands[1] = [card("2", "D", "invader-force")];
  state.melds[0] = [{
    id: "blocked-hearts",
    suit: "H",
    cards: [card("7", "H", "h7"), card("8", "H", "h8"), card("9", "H", "h9")],
    blockedBy: card("K", "D", "invading-king"),
  }];

  applyAction(state, 0, "Paolo", {
    type: "recall-exile",
    cardId: "exiled-king",
    meldId: "blocked-hearts",
    cardIds: ["legitimate-force"],
  });
  assert.equal(state.phase, "duel");
  assert.equal(state.pendingDuel?.fromExile, true);
  assert.equal(state.exile.length, 0);

  applyAction(state, 1, "Asi", { type: "duel-response", cardId: "invader-force" });
  assert.equal(state.phase, "ceremony");
  assert.equal(state.melds[0][0].blockedBy, undefined);
  assert.equal(state.prisoners[0][0]?.id, "invading-king");

  applyAction(state, 0, "Paolo", { type: "acknowledge-ceremony" });
  applyAction(state, 1, "Asi", { type: "acknowledge-ceremony" });
  assert.equal(state.phase, "fate-decision");
  assert.equal(state.pendingFateDecision?.card.id, "fate-legitimate");
});

test("una carta utile solo a chi la scarta si vincola a lui; una carta inutile resta neutrale", () => {
  const useful = waitingState();
  useful.phase = "meld";
  useful.hands[0] = [card("5", "H"), card("8", "C")];
  useful.melds[0] = [{ id: "mine", suit: "H", cards: [
    card("2", "H", "m2"), card("3", "H", "m3"), card("4", "H", "m4"),
  ] }];
  applyAction(useful, 0, "Paolo", { type: "discard", cardId: "H-5" });
  assert.equal(useful.discard.at(-1)?.boundPlayerId, 0);
  assert.equal(useful.discard.at(-1)?.bindingReason, "SELF_DECLINED");

  const neutral = waitingState();
  neutral.phase = "meld";
  neutral.hands[0] = [card("8", "C"), card("9", "D")];
  applyAction(neutral, 0, "Paolo", { type: "discard", cardId: "C-8" });
  assert.equal(neutral.discard.at(-1)?.boundPlayerId, undefined);
  assert.equal(neutral.discard.at(-1)?.pendingOfferPlayerId, undefined);
});

test("aggancia le carte compatibili senza farsi bloccare da una selezione estranea", () => {
  const state = waitingState();
  state.phase = "meld";
  state.hands[0] = [card("K", "H"), card("J", "H")];
  state.melds[0] = [{
    id: "hearts",
    suit: "H",
    cards: [card("A", "H"), card("2", "H"), card("3", "H"), card("4", "H"), card("5", "H")],
  }];

  applyAction(state, 0, "Paolo", { type: "extend", meldId: "hearts", cardIds: ["H-K", "H-J"] });
  assert.equal(state.melds[0][0].cards.some((item) => item.rank === "K"), true);
  assert.equal(state.hands[0].some((item) => item.rank === "J"), true);
});

test("classifica le scale e assegna i valori ufficiali", () => {
  const meld = (id: string, suit: Suit, cards: Card[], extras: Partial<Meld> = {}): Meld => ({ id, suit, cards, ...extras });
  assert.equal(classifyMeld(meld(
    "blocked",
    "H",
    [card("8", "H"), card("9", "H"), card("10", "H")],
    { blockedBy: card("K", "D") },
  )).points, -20);
  assert.equal(classifyMeld(meld("n", "H", [card("A", "H"), card("2", "H"), card("3", "H"), card("4", "H")])).points, 30);
  assert.equal(classifyMeld(meld("m", "S", [card("8", "S"), card("9", "S"), card("10", "S"), card("J", "S")])).points, 35);
  assert.equal(classifyMeld(meld("q", "D", [card("9", "D"), card("10", "D"), card("J", "D"), card("Q", "D")])).points, 40);
  assert.equal(classifyMeld(meld("k", "C", [card("Q", "C"), card("K", "C"), card("A", "C"), card("2", "C")])).points, 50);
  assert.equal(classifyMeld(meld("s", "H", [card("5", "H"), card("6", "H"), card("7", "H"), card("K", "H")], { sovereign: true })).points, 25);
  assert.deepEqual(
    classifyMeld(meld("natural-sovereign", "D", [card("4", "D"), card("5", "D"), card("6", "D"), card("7", "D"), card("K", "D")], { sovereign: true })),
    { meldId: "natural-sovereign", name: "Scala Naturale con Re Sovrano", points: 35, complete: true },
  );
  assert.deepEqual(
    classifyMeld(meld("military-sovereign", "S", [card("8", "S"), card("9", "S"), card("10", "S"), card("J", "S"), card("K", "S")], { sovereign: true })),
    { meldId: "military-sovereign", name: "Scala Militare con Re Sovrano", points: 40, complete: true },
  );
  assert.deepEqual(
    classifyMeld(meld("neutral", "D", [card("9", "D"), card("10", "D"), card("J", "D"), card("Q", "D"), card("★", "X")], { jokerAs: "K" })),
    { meldId: "neutral", name: "Scala Regina con Jolly libero", points: 40, complete: true },
  );
  assert.deepEqual(
    classifyMeld(meld("sovereign-free", "C", [card("4", "C"), card("5", "C"), card("6", "C"), card("7", "C"), card("★", "X"), card("K", "C")], { jokerAs: "8", sovereign: true })),
    { meldId: "sovereign-free", name: "Scala Naturale con Re Sovrano e Jolly libero", points: 35, complete: true },
  );
  assert.deepEqual(
    classifyMeld(meld("needed-end", "H", [card("6", "H"), card("7", "H"), card("8", "H"), card("★", "X")], { jokerAs: "9" })),
    { meldId: "needed-end", name: "Scala Matta", points: 20, complete: true },
  );
  assert.deepEqual(
    classifyMeld(meld("needed", "D", [card("9", "D"), card("★", "X"), card("J", "D"), card("Q", "D")], { jokerAs: "10" })),
    { meldId: "needed", name: "Scala Matta con la Regina", points: 30, complete: true },
  );
  assert.deepEqual(
    classifyMeld(meld("joker-king", "D", [card("10", "D"), card("J", "D"), card("Q", "D"), card("★", "X")], { jokerAs: "K" })),
    { meldId: "joker-king", name: "Scala Matta con la Regina", points: 30, complete: true },
  );
  assert.deepEqual(
    classifyMeld(meld("natural-king", "D", [card("10", "D"), card("★", "X"), card("Q", "D"), card("K", "D")], { jokerAs: "J" })),
    { meldId: "natural-king", name: "Scala Matta col Re", points: 40, complete: true },
  );
});

test("il Jolly libero conserva sempre la categoria naturale giÃ  raggiunta", () => {
  const cases: Array<[string, Card[], Rank, string, number]> = [
    ["free-j", [card("7", "H"), card("8", "H"), card("9", "H"), card("10", "H"), card("★", "X")], "J", "Scala Naturale con Jolly libero", 30],
    ["free-q", [card("8", "D"), card("9", "D"), card("10", "D"), card("J", "D"), card("★", "X")], "Q", "Scala Militare con Jolly libero", 35],
    ["free-k", [card("9", "C"), card("10", "C"), card("J", "C"), card("Q", "C"), card("★", "X")], "K", "Scala Regina con Jolly libero", 40],
    ["free-a", [card("10", "S"), card("J", "S"), card("Q", "S"), card("K", "S"), card("★", "X")], "A", "Scala Suprema con Jolly libero", 50],
  ];

  for (const [id, cards, jokerAs, name, points] of cases) {
    assert.deepEqual(
      classifyMeld({ id, suit: cards[0].suit as Suit, cards, jokerAs }),
      { meldId: id, name, points, complete: true },
    );
  }
});

test("calcola penalitÃ  e Dominio", () => {
  assert.equal(handPenalty([card("★", "X", "X-1"), card("Q", "H"), card("7", "S")]), 60);
  assert.equal(handPenalty([card("A", "D"), card("5", "C")]), 25);
  const state = waitingState();
  state.melds[0] = [{
    id: "h",
    suit: "H",
    cards: [card("A", "H"), card("2", "H"), card("3", "H"), card("4", "H"), card("5", "H")],
  }];
  state.melds[1] = [{
    id: "h2",
    suit: "H",
    cards: [card("7", "H"), card("8", "H"), card("9", "H"), card("10", "H")],
  }];
  assert.deepEqual(calculateDomains(state), [["H"], []]);

  state.melds[1][0].cards.push(card("J", "H"), card("Q", "H"));
  assert.deepEqual(calculateDomains(state), [[], ["H"]], "sei carte battono cinque carte dello stesso Regno");

  state.melds[0][0].cards.push(card("6", "H"));
  assert.deepEqual(calculateDomains(state), [[], []], "a paritÃ  il Dominio non viene assegnato");
});

function closableState(): GameState {
  const state = waitingState();
  state.phase = "meld";
  state.hands[0] = [card("10", "S")];
  state.hands[1] = [card("Q", "D"), card("★", "X", "X-1"), card("7", "C")];
  state.melds[0] = [
    { id: "h", suit: "H", cards: [card("A", "H"), card("2", "H"), card("3", "H"), card("4", "H")] },
    { id: "d", suit: "D", cards: [card("2", "D"), card("3", "D"), card("4", "D"), card("5", "D")] },
    { id: "c", suit: "C", cards: [card("6", "C"), card("7", "C"), card("8", "C"), card("9", "C")] },
    { id: "s", suit: "S", cards: [card("A", "S"), card("2", "S"), card("3", "S")] },
  ];
  return state;
}

test("riconosce le condizioni di chiusura", () => {
  assert.equal(canClose(closableState(), 0), true);
});

test("spiega quale Regno manca quando la chiusura non Ã¨ consentita", () => {
  const state = closableState();
  state.melds[0] = state.melds[0].filter((meld) => meld.suit !== "S");
  assert.throws(
    () => applyAction(state, 0, "Paolo", { type: "discard", cardId: "S-10" }),
    /manca una combinazione di Picche/,
  );
});

test("la chiusura calcola mano, penalitÃ  e totali", () => {
  const state = closableState();
  applyAction(state, 0, "Paolo", { type: "discard", cardId: "S-10" });
  assert.equal(state.phase, "hand-ended");
  assert.equal(state.handResult?.handScores[0], 140);
  assert.equal(state.handResult?.handScores[1], -60);
  assert.deepEqual(state.scores, [140, -60]);
});

test("ogni Dominio assegna 25 punti al conteggio della mano", () => {
  const state = closableState();
  state.melds[0][0].cards.push(card("5", "H"));
  applyAction(state, 0, "Paolo", { type: "discard", cardId: "S-10" });
  assert.deepEqual(state.handResult?.domains, [["H"], []]);
  assert.equal(state.handResult?.handScores[0], 165);
});

test("il Dominio dei Re assegna 20 punti ai Re normali e 30 ai Prigionieri", () => {
  const state = closableState();
  state.prisoners[0] = [card("K", "D", "captured-king")];
  state.courtKings[0] = [card("K", "C", "allied-king")];
  applyAction(state, 0, "Paolo", { type: "discard", cardId: "S-10" });
  assert.deepEqual(state.handResult?.prisonerPoints, [30, 0]);
  assert.deepEqual(state.handResult?.normalKingPoints, [20, 0]);
  assert.deepEqual(state.handResult?.kingCounts, [2, 0]);
  assert.equal(state.handResult?.handScores[0], 190);
});

test("il Jolly Ã¨ scartabile, mentre il K richiede l'Esilio del Re", () => {
  const jokerState = waitingState();
  jokerState.phase = "draw";
  jokerState.deck = [card("7", "D", "drawn-after-joker")];
  jokerState.hands[0] = [card("★", "X", "last-joker")];
  jokerState.hands[1] = [card("4", "C", "opponent-joker")];

  applyAction(jokerState, 0, "Paolo", { type: "draw-deck" });
  applyAction(jokerState, 0, "Paolo", { type: "discard", cardId: "last-joker" });

  assert.equal(jokerState.turn, 1);
  assert.deepEqual(jokerState.hands[0].map((item) => item.rank), ["7"]);

  const kingState = waitingState();
  kingState.phase = "draw";
  kingState.deck = [card("8", "C", "fate-after-king"), card("7", "D", "drawn-after-king")];
  kingState.hands[0] = [card("K", "H", "last-king")];
  kingState.hands[1] = [card("4", "C", "opponent-king")];

  applyAction(kingState, 0, "Paolo", { type: "draw-deck" });
  applyAction(kingState, 0, "Paolo", { type: "discard", cardId: "last-king" });
  assert.equal(kingState.exile.at(-1)?.id, "last-king");
  assert.equal(kingState.phase, "fate-decision");
});

test("una nuova mano conserva i totali e alterna il primo giocatore", () => {
  const state = closableState();
  applyAction(state, 0, "Paolo", { type: "discard", cardId: "S-10" });
  const next = startNextHand(state, ["Paolo", "Asi"]);
  assert.equal(next.handNumber, 2);
  assert.deepEqual(next.scores, [140, -60]);
  assert.equal(next.turn, 1);
  assert.equal(next.hands[0].length, 7);
});

test("la Nuova Battaglia comincia soltanto dopo la conferma di entrambi", () => {
  const state = closableState();
  applyAction(state, 0, "Paolo", { type: "discard", cardId: "S-10" });
  const waiting = acceptNextBattle(state, 0, ["Paolo", "Asi"]);
  assert.equal(waiting.phase, "hand-ended");
  assert.deepEqual(waiting.nextBattleAccepted, [true, false]);
  const next = acceptNextBattle(waiting, 1, ["Paolo", "Asi"]);
  assert.equal(next.phase, "draw");
  assert.equal(next.handNumber, 2);
  assert.deepEqual(next.scores, [140, -60]);
});

test("esegue una mano completa dalla pesca alla distribuzione successiva", () => {
  const state = waitingState();
  state.phase = "draw";
  state.deck = [card("10", "S")];
  state.discard = [card("K", "C")];
  state.hands[0] = [
    card("A", "H"), card("2", "H"), card("3", "H"), card("4", "H"),
    card("2", "D"), card("3", "D"), card("4", "D"), card("5", "D"),
    card("6", "C"), card("7", "C"), card("8", "C"), card("9", "C"),
    card("A", "S"), card("2", "S"), card("3", "S"),
  ];
  state.hands[1] = [card("Q", "D"), card("★", "X", "X-1"), card("7", "C")];

  applyAction(state, 0, "Paolo", { type: "draw-deck" });
  applyAction(state, 0, "Paolo", { type: "meld", cardIds: ["H-A", "H-2", "H-3", "H-4"] });
  applyAction(state, 0, "Paolo", { type: "meld", cardIds: ["D-2", "D-3", "D-4", "D-5"] });
  applyAction(state, 0, "Paolo", { type: "meld", cardIds: ["C-6", "C-7", "C-8", "C-9"] });
  applyAction(state, 0, "Paolo", { type: "meld", cardIds: ["S-A", "S-2", "S-3"] });
  applyAction(state, 0, "Paolo", { type: "discard", cardId: "S-10" });

  assert.equal(state.phase, "hand-ended");
  assert.deepEqual(state.scores, [140, -60]);
  assert.equal(state.handResult?.closer, 0);
  assert.equal(state.hands[0].length, 0);
  assert.match(state.log[0].text, /ha chiuso la mano/);

  const next = startNextHand(state, ["Paolo", "Asi"]);
  assert.equal(next.phase, "draw");
  assert.equal(next.handNumber, 2);
  assert.equal(next.turn, 1);
  assert.deepEqual(next.scores, [140, -60]);
  assert.equal(next.hands[0].length, 7);
  assert.equal(next.hands[1].length, 7);
});

test("conclude la partita oltre mille punti con cinquanta punti di vantaggio", () => {
  const state = closableState();
  state.scores = [900, 100];
  applyAction(state, 0, "Paolo", { type: "discard", cardId: "S-10" });
  assert.equal(state.phase, "game-ended");
  assert.equal(state.winner, 0);
  assert.deepEqual(state.scores, [1040, 40]);
});

test("dopo la vittoria permette una nuova partita senza schermata bloccata", () => {
  const state = closableState();
  state.scores = [900, 100];
  applyAction(state, 0, "Paolo", { type: "discard", cardId: "S-10" });
  const restarted = restartGame(state, ["Paolo", "Asi"]);
  assert.equal(restarted.phase, "draw");
  assert.equal(restarted.handNumber, 1);
  assert.deepEqual(restarted.scores, [0, 0]);
  assert.equal(restarted.handResult, undefined);
  assert.equal(restarted.winner, undefined);
});

test("il Nuovo Dominio azzera il match soltanto dopo la conferma di entrambi", () => {
  const state = closableState();
  state.scores = [900, 100];
  applyAction(state, 0, "Paolo", { type: "discard", cardId: "S-10" });
  const waiting = acceptNewDomain(state, 1, ["Paolo", "Asi"]);
  assert.equal(waiting.phase, "game-ended");
  assert.deepEqual(waiting.newDomainAccepted, [false, true]);
  const restarted = acceptNewDomain(waiting, 0, ["Paolo", "Asi"]);
  assert.equal(restarted.phase, "draw");
  assert.deepEqual(restarted.scores, [0, 0]);
});

test("l'abbandono interrompe la partita e registra il giocatore", () => {
  const state = waitingState();
  state.phase = "draw";
  const next = abandonGame(state, 1, "Asi");
  assert.equal(next.phase, "abandoned");
  assert.equal(next.abandonedBy, 1);
  assert.match(next.log[0].text, /Asi ha abbandonato/);
  assert.equal(state.phase, "draw");
});


