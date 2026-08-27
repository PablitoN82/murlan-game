import test from "node:test";
import assert from "node:assert/strict";
import { applyAction, type Card, type GameState } from "../lib/game";

const card = (rank: Card["rank"], suit: Card["suit"]): Card => ({ id: `${rank}-${suit}`, rank, suit });

test("dopo il 2 e tre passi il leader apre liberamente con una scala", () => {
  const state: GameState = {
    phase: "playing", humanCount: 4,
    players: [0, 1, 2, 3].map((seat) => ({ name: `P${seat + 1}`, bot: false, team: (seat % 2) as 0 | 1, cards: 0 })),
    hands: [
      [card("2", "S"), card("3", "H"), card("4", "D"), card("5", "C"), card("6", "S"), card("7", "H")],
      [card("8", "H")], [card("9", "H")], [card("10", "H")],
    ],
    turn: 0, leader: 0, passes: [], finishOrder: [], scores: [0, 0], target: 21,
    handNumber: 2, openingPlay: false, log: [],
  };
  state.players.forEach((player, seat) => player.cards = state.hands[seat].length);

  applyAction(state, 0, { type: "play", cardIds: ["2-S"] });
  applyAction(state, 1, { type: "pass" });
  applyAction(state, 2, { type: "pass" });
  applyAction(state, 3, { type: "pass" });

  assert.equal(state.turn, 0);
  assert.equal(state.currentPlay, undefined);
  assert.deepEqual(state.passes, []);

  applyAction(state, 0, { type: "play", cardIds: ["3-H", "4-D", "5-C", "6-S", "7-H"] });
  assert.equal(state.currentPlay?.kind, "straight");
});
