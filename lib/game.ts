export type Suit = "H" | "D" | "C" | "S" | "X";
export type Rank = "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A" | "2" | "BJ" | "RJ";
export type Card = { id: string; rank: Rank; suit: Suit };
export type ComboKind = "single" | "pair" | "triple" | "straight" | "triple-run" | "five-pairs" | "bomb" | "straight-flush";
export type Play = { seat: number; cards: Card[]; kind: ComboKind; value: number; suit: number };
export type GamePhase = "waiting" | "playing" | "exchange" | "match-over";
export type Player = { name: string; bot: boolean; team: 0 | 1; cards: number };
export type GameState = {
  phase: GamePhase; humanCount: number; players: Player[]; hands: Card[][]; turn: number; leader: number;
  currentPlay?: Play; pile: Play[]; passes: number[]; finishOrder: number[]; scores: [number, number]; target: number;
  handNumber: number; openingPlay: boolean; botNames?: string[]; pendingExchange?: { first: number; last: number; giveCardId: string }; lastResult?: { order: number[]; points: [number, number] }; log: string[];
};
export type PublicGameState = Omit<GameState, "hands"> & { hand: Card[] };

const ranks: Rank[] = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2", "BJ", "RJ"];
const suits: Suit[] = ["H", "D", "C", "S"];
const rankValue = (rank: Rank) => ranks.indexOf(rank);
const suitValue = (suit: Suit) => ({ H: 0, D: 1, C: 2, S: 3, X: 4 })[suit];
const cardLabel = (c: Card) => c.rank === "BJ" ? "Jolly Nero" : c.rank === "RJ" ? "Jolly Rosso" : `${c.rank}${({ H: "♥", D: "♦", C: "♣", S: "♠", X: "" })[c.suit]}`;

export function createDeck() {
  const deck: Card[] = [];
  for (const suit of suits) for (const rank of ranks.slice(0, 13)) deck.push({ id: `${rank}-${suit}`, rank, suit });
  deck.push({ id: "BJ-X", rank: "BJ", suit: "X" }, { id: "RJ-X", rank: "RJ", suit: "X" });
  return deck;
}
function shuffle<T>(items: T[]) { const result = [...items]; for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; } return result; }
function consecutive(values: number[]) { return values.every((value, index) => index === 0 || value === values[index - 1] + 1); }

export function classify(cards: Card[]): Omit<Play, "seat" | "cards"> | null {
  if (!cards.length || cards.some((c) => c.suit === "X") && cards.length > 1) return cards.length === 1 ? { kind: "single", value: rankValue(cards[0].rank), suit: suitValue(cards[0].suit) } : null;
  const groups = new Map<number, Card[]>();
  for (const card of cards) groups.set(rankValue(card.rank), [...(groups.get(rankValue(card.rank)) ?? []), card]);
  const values = [...groups.keys()].sort((a, b) => a - b); const maxSuit = Math.max(...cards.map((c) => suitValue(c.suit)));
  if (cards.length === 1) return { kind: "single", value: values[0], suit: maxSuit };
  if (values.length === 1 && cards.length === 2) return { kind: "pair", value: values[0], suit: maxSuit };
  if (values.length === 1 && cards.length === 3) return { kind: "triple", value: values[0], suit: maxSuit };
  if (values.length === 1 && cards.length === 4) return { kind: "bomb", value: values[0], suit: maxSuit };
  if (cards.length === 5 && values.length === 5 && consecutive(values) && new Set(cards.map((c) => c.suit)).size === 1) return { kind: "straight-flush", value: values.at(-1)!, suit: maxSuit };
  if (cards.length >= 5 && values.length === cards.length && consecutive(values) && values.at(-1)! <= rankValue("A")) return { kind: "straight", value: values.at(-1)!, suit: maxSuit };
  if (cards.length === 5 && values.length === 3 && consecutive(values) && values.map((v) => groups.get(v)!.length).join("") === "131") return { kind: "triple-run", value: values[1], suit: maxSuit };
  if (cards.length === 10 && values.length === 5 && consecutive(values) && values.every((v) => groups.get(v)!.length === 2)) return { kind: "five-pairs", value: values.at(-1)!, suit: maxSuit };
  return null;
}
export function canBeat(candidate: Omit<Play, "seat" | "cards">, cardsLength: number, current?: Play) {
  if (!current) return true;
  const special = candidate.kind === "bomb" || candidate.kind === "straight-flush";
  const currentSpecial = current.kind === "bomb" || current.kind === "straight-flush";
  if (special && !currentSpecial) return true;
  if (candidate.kind !== current.kind || cardsLength !== current.cards.length) return false;
  if (candidate.value > current.value) return true;
  if (candidate.value < current.value) return false;
  const suitBreaksTie = candidate.kind === "straight" || candidate.kind === "straight-flush";
  return suitBreaksTie && candidate.suit > current.suit;
}
function nextActive(state: GameState, from: number) { for (let n = 1; n <= 4; n++) { const seat = (from + n) % 4; if (!state.finishOrder.includes(seat)) return seat; } return from; }
function activeSeats(state: GameState) { return [0, 1, 2, 3].filter((seat) => !state.finishOrder.includes(seat)); }

function deal(state: GameState) {
  const deck = shuffle(createDeck()); state.hands = [[], [], [], []]; deck.forEach((card, index) => state.hands[index % 4].push(card));
  state.players.forEach((p, i) => p.cards = state.hands[i].length); state.finishOrder = []; state.passes = []; state.pile = []; delete state.currentPlay; delete state.pendingExchange; state.openingPlay = state.handNumber === 1;
  if (state.handNumber === 1) state.turn = state.hands.findIndex((hand) => hand.some((card) => card.id === "3-S"));
  else {
    const previous = state.lastResult?.order ?? [0, 1, 2, 3]; const first = previous[0], last = previous[3];
    const bothJokers = state.hands[last].some((c) => c.rank === "BJ") && state.hands[last].some((c) => c.rank === "RJ");
    if (!bothJokers) {
      const give = [...state.hands[last]].sort((a, b) => rankValue(b.rank) - rankValue(a.rank) || suitValue(b.suit) - suitValue(a.suit))[0];
      if (give) { state.hands[last] = state.hands[last].filter((card) => card.id !== give.id); state.hands[first].push(give); state.pendingExchange = { first, last, giveCardId: give.id }; state.phase = "exchange"; state.turn = first; }
    } else { state.phase = "playing"; state.turn = first; state.log.unshift("Scambio annullato: l’ultimo classificato possiede entrambi i Jolly."); }
  }
  state.leader = state.turn; state.players.forEach((p, i) => p.cards = state.hands[i].length);
}

export function waitingState(humanCount: number, hostName: string, botNames: string[] = []): GameState { return { phase: "waiting", humanCount, botNames, players: [{ name: hostName, bot: false, team: 0, cards: 0 }], hands: [[], [], [], []], turn: 0, leader: 0, pile: [], passes: [], finishOrder: [], scores: [0, 0], target: 21, handNumber: 1, openingPlay: true, log: ["Stanza creata. In attesa dei compagni..."] }; }
export function startGame(state: GameState) { while (state.players.length < 4) { const seat = state.players.length; const customName = state.botNames?.[seat - state.humanCount]?.trim(); state.players.push({ name: customName || `Bot ${seat + 1}`, bot: true, team: (seat % 2) as 0 | 1, cards: 0 }); } state.players.forEach((p, seat) => p.team = (seat % 2) as 0 | 1); state.phase = "playing"; state.log = ["La partita è iniziata. Il 3♠ apre la prima mano."]; deal(state); return runBots(state); }
function finishHand(state: GameState) {
  const pts = [3, 2, 1, 0]; const teamPoints: [number, number] = [0, 0]; state.finishOrder.forEach((seat, place) => teamPoints[state.players[seat].team] += pts[place]);
  state.scores[0] += teamPoints[0]; state.scores[1] += teamPoints[1]; state.lastResult = { order: [...state.finishOrder], points: teamPoints };
  const reached = [state.scores[0] >= state.target, state.scores[1] >= state.target];
  if (reached[0] && reached[1] && state.target < 51) state.target += 10; else if (reached[0] !== reached[1] || state.target === 51 && state.scores[0] !== state.scores[1]) { state.phase = "match-over"; state.log.unshift(`Mano conclusa: Squadra Ambra +${teamPoints[0]}, Squadra Giada +${teamPoints[1]}.`); return; }
  state.log.unshift(`Mano conclusa: Squadra Ambra +${teamPoints[0]}, Squadra Giada +${teamPoints[1]}.`);
  state.handNumber += 1; deal(state);
}
function playInternal(state: GameState, seat: number, cardIds: string[]) {
  if (state.phase !== "playing" || seat !== state.turn) throw new Error("Non è il tuo turno.");
  state.pile ??= [];
  const chosen = cardIds.map((id) => state.hands[seat].find((c) => c.id === id)).filter(Boolean) as Card[]; if (chosen.length !== cardIds.length) throw new Error("Una carta scelta non è disponibile.");
  const combo = classify(chosen); if (!combo) throw new Error("Questa combinazione non è valida."); if (state.openingPlay && !chosen.some((c) => c.id === "3-S")) throw new Error("La prima giocata deve contenere il 3♠."); if (!canBeat(combo, chosen.length, state.currentPlay)) throw new Error("Devi giocare lo stesso tipo più alto, oppure una combinazione speciale.");
  state.hands[seat] = state.hands[seat].filter((c) => !cardIds.includes(c.id)); state.currentPlay = { seat, cards: chosen, ...combo }; state.pile.push(state.currentPlay); state.leader = seat; state.passes = []; state.openingPlay = false; state.players[seat].cards = state.hands[seat].length; state.log.unshift(`${state.players[seat].name} gioca ${chosen.map(cardLabel).join(" ")}.`);
  if (!state.hands[seat].length) { state.finishOrder.push(seat); state.log.unshift(`${state.players[seat].name} chiude in ${state.finishOrder.length}ª posizione.`); if (state.finishOrder.length === 3) { state.finishOrder.push([0, 1, 2, 3].find((s) => !state.finishOrder.includes(s))!); finishHand(state); return; } }
  state.turn = nextActive(state, seat);
}
function passInternal(state: GameState, seat: number) {
  if (state.phase !== "playing" || seat !== state.turn) throw new Error("Non è il tuo turno."); if (!state.currentPlay) throw new Error("Chi apre il giro non può passare.");
  if (!state.passes.includes(seat)) state.passes.push(seat);
  state.log.unshift(`${state.players[seat].name} passa.`);
  const stillPlaying = activeSeats(state);
  const everyoneElsePassed = stillPlaying.every((activeSeat) => activeSeat === state.leader || state.passes.includes(activeSeat));
  if (everyoneElsePassed) {
    const opener = state.finishOrder.includes(state.leader) ? nextActive(state, state.leader) : state.leader;
    state.turn = opener; state.leader = opener; state.passes = []; delete state.currentPlay;
    state.log.unshift(`${state.players[opener].name} apre un nuovo giro.`);
  } else state.turn = nextActive(state, seat);
}
function exchangeInternal(state: GameState, seat: number, cardId: string) {
  const pending = state.pendingExchange;
  if (state.phase !== "exchange" || !pending || seat !== pending.first) throw new Error("Non spetta a te effettuare lo scambio.");
  const back = state.hands[seat].find((card) => card.id === cardId);
  const give = state.hands[seat].find((card) => card.id === pending.giveCardId);
  if (!back || back.id === pending.giveCardId || rankValue(back.rank) > rankValue("10") || back.suit === "X") throw new Error("Devi restituire una tua carta compresa tra 3 e 10.");
  if (!give) throw new Error("La carta dello scambio non è disponibile.");
  state.hands[seat] = state.hands[seat].filter((card) => card.id !== back.id);
  state.hands[pending.last].push(back);
  state.players.forEach((player, index) => player.cards = state.hands[index].length);
  state.log.unshift(`Scambio: ${state.players[pending.last].name} cede ${cardLabel(give)}; ${state.players[seat].name} restituisce ${cardLabel(back)}.`);
  state.turn = pending.last; state.leader = pending.last; state.phase = "playing"; delete state.pendingExchange;
}
function combinations(hand: Card[], current?: Play, mustContain?: string) {
  const found: Card[][] = []; const add = (cards: Card[]) => { if (mustContain && !cards.some((c) => c.id === mustContain)) return; const combo = classify(cards); if (combo && canBeat(combo, cards.length, current)) found.push(cards); };
  hand.forEach((c) => add([c])); const byRank = new Map<Rank, Card[]>(); hand.forEach((c) => byRank.set(c.rank, [...(byRank.get(c.rank) ?? []), c]));
  for (const cards of byRank.values()) { if (cards.length >= 2) add(cards.slice(0, 2)); if (cards.length >= 3) add(cards.slice(0, 3)); if (cards.length === 4) add(cards); }
  for (let center = 1; center < rankValue("A"); center++) {
    const middle = byRank.get(ranks[center]) ?? []; const low = byRank.get(ranks[center - 1]) ?? []; const high = byRank.get(ranks[center + 1]) ?? [];
    if (middle.length >= 3 && low.length && high.length) add([low[0], ...middle.slice(0, 3), high[0]]);
  }
  for (let start = 0; start <= rankValue("A") - 4; start++) {
    const pairs = Array.from({ length: 5 }, (_, i) => (byRank.get(ranks[start + i]) ?? []).slice(0, 2));
    if (pairs.every((pair) => pair.length === 2)) add(pairs.flat());
  }
  for (let start = 0; start <= rankValue("A") - 4; start++) for (let len = 5; start + len - 1 <= rankValue("A"); len++) { const seq = Array.from({ length: len }, (_, i) => [...(byRank.get(ranks[start + i]) ?? [])][0]); if (seq.every(Boolean)) add(seq as Card[]); }
  for (const suit of suits) for (let start = 0; start <= rankValue("A") - 4; start++) { const seq = Array.from({ length: 5 }, (_, i) => hand.find((c) => c.suit === suit && rankValue(c.rank) === start + i)); if (seq.every(Boolean)) add(seq as Card[]); }
  return found.sort((a, b) => current ? a.length - b.length || Math.max(...a.map((c) => rankValue(c.rank))) - Math.max(...b.map((c) => rankValue(c.rank))) : b.length - a.length || Math.max(...a.map((c) => rankValue(c.rank))) - Math.max(...b.map((c) => rankValue(c.rank))));
}
export function runBots(state: GameState) {
  let guard = 0;
  while ((state.phase === "playing" || state.phase === "exchange") && state.players[state.turn]?.bot && guard++ < 100) {
    const seat = state.turn;
    if (state.phase === "exchange") { const back = [...state.hands[seat]].filter((card) => card.id !== state.pendingExchange?.giveCardId && card.suit !== "X" && rankValue(card.rank) <= rankValue("10")).sort((a,b) => rankValue(a.rank)-rankValue(b.rank) || suitValue(a.suit)-suitValue(b.suit))[0]; if (!back) throw new Error("Il bot non ha una carta valida per lo scambio."); exchangeInternal(state, seat, back.id); continue; }
    const teammateLeads = !!state.currentPlay && state.players[state.currentPlay.seat].team === state.players[seat].team;
    if (teammateLeads) { passInternal(state, seat); continue; }
    const options = combinations(state.hands[seat], state.currentPlay, state.openingPlay ? "3-S" : undefined);
    if (options.length) playInternal(state, seat, options[0].map((card) => card.id)); else passInternal(state, seat);
  }
  return state;
}
export function applyAction(state: GameState, seat: number, action: { type: "play" | "pass" | "exchange"; cardIds?: string[] }) { if (action.type === "exchange") exchangeInternal(state, seat, action.cardIds?.[0] ?? ""); else if (action.type === "play") playInternal(state, seat, action.cardIds ?? []); else passInternal(state, seat); return runBots(state); }
export function publicState(state: GameState, seat: number): PublicGameState { const { hands, ...rest } = state; return { ...rest, players: state.players.map((p, i) => ({ ...p, cards: hands[i]?.length ?? p.cards })), hand: hands[seat] ?? [] }; }
export function addHuman(state: GameState, name: string) { if (state.phase !== "waiting" || state.players.length >= state.humanCount) throw new Error("La stanza non può accettare altri giocatori."); const seat = state.players.length; state.players.push({ name, bot: false, team: (seat % 2) as 0 | 1, cards: 0 }); state.log.unshift(`${name} è entrato nella stanza.`); if (state.players.length === state.humanCount) startGame(state); return seat; }
